// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserForConversations } from '../services/chats/getUserForConversations';
import { createConversation } from '../services/chats/createConversation';
import { createProjectConversation } from '../services/chats/createPorjectConversation';
import { useAuth } from '../context/AuthContext';
import { getMyProjects } from '../services/projects/getProjectsByLoginUserId';
import { getEmployeesAssignedToProject } from '../services/projects/getEmployeesAssignedToProject';
import { Brand } from '../constants/brandColors';

const ACCENT = Brand.ink;

const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '?';
  if (!lastName) return String(firstName).charAt(0).toUpperCase();
  return (
    String(firstName).charAt(0) + String(lastName).charAt(0)
  ).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    Brand.ink,
    '#3A3637',
    '#0D9488',
    '#D97706',
    '#DC2626',
    '#6E6869',
    '#059669',
    '#4F46E5',
  ];
  let hash = 0;
  const value = String(name || '');
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function ModeTab({ label, active, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[styles.modeTab, active && styles.modeTabActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? '#FFFFFF' : Brand.inkMuted}
      />
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const SelectUserModal = ({ visible, onClose, onUserSelect }) => {
  const [mode, setMode] = useState('direct');
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const [showConversationExistsDialog, setShowConversationExistsDialog] =
    useState(false);
  const [existingConversationData, setExistingConversationData] =
    useState(null);

  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  useEffect(() => {
    if (!visible) return;
    setMode('direct');
    setSearchQuery('');
    setSelectedProject(null);
    setProjectSearchQuery('');
    setShowProjectPicker(false);
    setError(null);
    fetchEmployees();
  }, [visible]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getUserForConversations();
      const list = Array.isArray(response) ? response : [];
      setEmployees(
        list.filter((emp) => emp.id?.toString() !== currentUserId?.toString())
      );
    } catch {
      setError('Failed to load team members. Please try again.');
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await getMyProjects();
      setProjects(Array.isArray(response) ? response : []);
    } catch {
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) => {
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`
        .trim()
        .toLowerCase();
      const email = String(employee.email || '').toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [searchQuery, employees]);

  const filteredProjects = useMemo(() => {
    const query = projectSearchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      String(project.name || project.title || '')
        .toLowerCase()
        .includes(query)
    );
  }, [projectSearchQuery, projects]);

  const handleClose = () => {
    setSearchQuery('');
    setError(null);
    setSelectedProject(null);
    setProjectSearchQuery('');
    setShowProjectPicker(false);
    Keyboard.dismiss();
    onClose();
  };

  const handleUserSelect = async (employee) => {
    if (mode === 'project') return;
    if (!employee?.id) {
      Alert.alert('Error', 'Employee ID is missing. Please try again.');
      return;
    }

    setIsCreatingConversation(true);
    try {
      const employeeId =
        typeof employee.id === 'string'
          ? parseInt(employee.id, 10)
          : employee.id;

      const response = await createConversation({
        type: 'private',
        participantIds: [employeeId],
      });

      onUserSelect?.({
        employee,
        conversation: response,
        project: null,
        userId: employeeId,
      });
      handleClose();
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const existing =
        err?.body?.conversation || err?.response?.data?.conversation;
      if (status === 400 && existing) {
        setExistingConversationData(existing);
        setShowConversationExistsDialog(true);
      } else {
        Alert.alert(
          'Error',
          err?.message || 'Failed to create conversation. Please try again.'
        );
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleCreateProjectChat = async () => {
    if (!selectedProject?.id) {
      Alert.alert('Select a project', 'Choose a project before starting a group chat.');
      return;
    }
    if (employees.length === 0) {
      Alert.alert(
        'No team members',
        'Assign people to this project first, then create the group chat.'
      );
      return;
    }

    setIsCreatingConversation(true);
    try {
      const response = await createProjectConversation(selectedProject.id);
      onUserSelect?.({
        conversation: response,
        project: selectedProject,
        isGroupChat: true,
      });
      handleClose();
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const existing =
        err?.body?.conversation || err?.response?.data?.conversation;
      if (status === 400 && existing) {
        setExistingConversationData(existing);
        setShowConversationExistsDialog(true);
      } else {
        Alert.alert(
          'Error',
          err?.message || 'Failed to create project chat. Please try again.'
        );
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleConversationExistsDialogOk = () => {
    if (existingConversationData && onUserSelect) {
      const isGroupChat =
        existingConversationData.type === 'group' || mode === 'project';
      const navigationData = {
        conversation: existingConversationData,
        isGroupChat,
      };
      if (isGroupChat && selectedProject) {
        navigationData.project = selectedProject;
      }
      if (!isGroupChat && existingConversationData.participants) {
        const otherParticipant = existingConversationData.participants.find(
          (p) => p.user?.id?.toString() !== currentUserId?.toString()
        );
        navigationData.employee = otherParticipant?.user;
      }
      onUserSelect(navigationData);
    }
    setShowConversationExistsDialog(false);
    setExistingConversationData(null);
    handleClose();
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setShowProjectPicker(false);
    setProjectSearchQuery('');
    if (!project?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const projectData = await getEmployeesAssignedToProject(project.id);
      const assigned = Array.isArray(projectData?.assignedTo)
        ? projectData.assignedTo
        : [];
      setEmployees(
        assigned.filter(
          (emp) => emp.id?.toString() !== currentUserId?.toString()
        )
      );
    } catch {
      setEmployees([]);
      setError('Failed to load project members.');
    } finally {
      setIsLoading(false);
    }
  };

  const openProjectPicker = async () => {
    setShowProjectPicker(true);
    await fetchProjects();
  };

  const switchMode = async (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSearchQuery('');
    setError(null);
    setSelectedProject(null);
    if (nextMode === 'direct') {
      await fetchEmployees();
    } else {
      setEmployees([]);
    }
  };

  const renderEmployeeItem = ({ item }) => {
    const firstName = item.first_name || '';
    const lastName = item.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
    const email = item.email || '';
    const color = getAvatarColor(fullName);

    return (
      <TouchableOpacity
        style={styles.personRow}
        onPress={() => handleUserSelect(item)}
        activeOpacity={0.8}
        disabled={mode === 'project' || isCreatingConversation}
      >
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>
            {getInitials(firstName, lastName)}
          </Text>
        </View>
        <View style={styles.personMain}>
          <Text style={styles.personName} numberOfLines={1}>
            {fullName}
          </Text>
          {email ? (
            <Text style={styles.personEmail} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
        <View style={styles.chatCue}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={ACCENT} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>New chat</Text>
              <Text style={styles.headerSubtitle}>
                Message a teammate or start a project group
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isCreatingConversation}
              style={styles.closeBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={Brand.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <ModeTab
              label="Direct"
              icon="person-outline"
              active={mode === 'direct'}
              onPress={() => switchMode('direct')}
            />
            <ModeTab
              label="Project"
              icon="briefcase-outline"
              active={mode === 'project'}
              onPress={() => switchMode('project')}
            />
          </View>
        </View>

        {mode === 'direct' ? (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={Brand.inkFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people"
              placeholderTextColor={Brand.inkFaint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Brand.inkFaint} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.projectBlock}>
            <Text style={styles.sectionLabel}>Project</Text>
            <TouchableOpacity
              style={styles.projectPickerBtn}
              onPress={openProjectPicker}
              activeOpacity={0.85}
            >
              <View style={styles.projectIcon}>
                <Ionicons name="folder-outline" size={18} color={ACCENT} />
              </View>
              <View style={styles.projectPickerMain}>
                <Text
                  style={[
                    styles.projectPickerTitle,
                    !selectedProject && styles.projectPickerPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedProject
                    ? selectedProject.name ||
                      selectedProject.title ||
                      'Unnamed project'
                    : 'Choose a project'}
                </Text>
                <Text style={styles.projectPickerHint}>
                  {selectedProject
                    ? `${employees.length} member${employees.length === 1 ? '' : 's'} available`
                    : 'Creates one group chat for the project team'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Brand.inkFaint} />
            </TouchableOpacity>

            {selectedProject ? (
              <TouchableOpacity
                style={[
                  styles.createProjectBtn,
                  (employees.length === 0 || isLoading) &&
                    styles.createProjectBtnDisabled,
                ]}
                onPress={handleCreateProjectChat}
                disabled={employees.length === 0 || isLoading || isCreatingConversation}
                activeOpacity={0.85}
              >
                <Text style={styles.createProjectBtnText}>Start project chat</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>
            {mode === 'direct' ? 'People' : 'Project members'}
          </Text>
          <Text style={styles.countLabel}>
            {filteredEmployees.length}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={34} color="#DC2626" />
            <Text style={styles.stateTitle}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchEmployees}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'project' && !selectedProject ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="briefcase-outline" size={28} color={Brand.inkFaint} />
            </View>
            <Text style={styles.stateTitle}>Select a project</Text>
            <Text style={styles.stateText}>
              Pick a project above to preview members and start the group chat
            </Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={searchQuery ? 'search-outline' : 'people-outline'}
                size={28}
                color={Brand.inkFaint}
              />
            </View>
            <Text style={styles.stateTitle}>
              {searchQuery ? 'No matches' : 'No people available'}
            </Text>
            <Text style={styles.stateText}>
              {searchQuery
                ? 'Try another name or email'
                : mode === 'project'
                  ? 'This project has no assigned members yet'
                  : 'There are no teammates to message right now'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item, index) =>
              item.id?.toString() || `person-${index}`
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <Modal
          visible={showProjectPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProjectPicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowProjectPicker(false)}
          >
            <Pressable style={styles.pickerCard} onPress={() => {}}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select project</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowProjectPicker(false)}
                >
                  <Ionicons name="close" size={18} color={Brand.ink} />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerSearch}>
                <Ionicons name="search" size={16} color={Brand.inkFaint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search projects"
                  placeholderTextColor={Brand.inkFaint}
                  value={projectSearchQuery}
                  onChangeText={setProjectSearchQuery}
                />
              </View>

              {isLoadingProjects ? (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator color={ACCENT} />
                </View>
              ) : (
                <FlatList
                  data={filteredProjects}
                  keyExtractor={(item, index) =>
                    item.id?.toString() || `project-${index}`
                  }
                  style={styles.pickerList}
                  renderItem={({ item }) => {
                    const active = selectedProject?.id === item.id;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.projectOption,
                          active && styles.projectOptionActive,
                        ]}
                        onPress={() => handleProjectSelect(item)}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            styles.projectOptionIcon,
                            active && styles.projectOptionIconActive,
                          ]}
                        >
                          <Ionicons
                            name="folder"
                            size={16}
                            color={active ? '#FFFFFF' : ACCENT}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.projectOptionTitle} numberOfLines={1}>
                            {item.name || item.title || 'Unnamed project'}
                          </Text>
                          {item.company?.name ? (
                            <Text style={styles.projectOptionMeta} numberOfLines={1}>
                              {item.company.name}
                            </Text>
                          ) : null}
                        </View>
                        {active ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={ACCENT}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={styles.pickerEmpty}>No projects found</Text>
                  }
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {isCreatingConversation ? (
          <View style={styles.busyOverlay}>
            <View style={styles.busyCard}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.busyText}>Starting chat…</Text>
            </View>
          </View>
        ) : null}

        {showConversationExistsDialog ? (
          <View style={styles.busyOverlay}>
            <View style={styles.existsCard}>
              <View style={styles.existsIcon}>
                <Ionicons name="chatbubbles" size={28} color={ACCENT} />
              </View>
              <Text style={styles.existsTitle}>Chat already exists</Text>
              <Text style={styles.existsBody}>
                {mode === 'project'
                  ? 'Opening the existing project conversation.'
                  : 'Opening your existing conversation with this person.'}
              </Text>
              <TouchableOpacity
                style={styles.existsBtn}
                onPress={handleConversationExistsDialogOk}
                activeOpacity={0.85}
              >
                <Text style={styles.existsBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.paperSoft,
  },
  header: {
    backgroundColor: Brand.paper,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Brand.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Brand.inkMuted,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: Brand.paperSoft,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  modeTabActive: {
    backgroundColor: ACCENT,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.inkMuted,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: Brand.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Brand.ink,
    paddingVertical: 10,
  },
  projectBlock: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  projectPickerBtn: {
    backgroundColor: Brand.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Brand.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  projectPickerMain: {
    flex: 1,
    paddingRight: 8,
  },
  projectPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  projectPickerPlaceholder: {
    color: Brand.inkFaint,
    fontWeight: '600',
  },
  projectPickerHint: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkMuted,
  },
  createProjectBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createProjectBtnDisabled: {
    opacity: 0.45,
  },
  createProjectBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  listHeader: {
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.inkFaint,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  personMain: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  personEmail: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkMuted,
  },
  chatCue: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  stateText: {
    fontSize: 13,
    color: Brand.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pickerCard: {
    backgroundColor: Brand.paper,
    borderRadius: 20,
    maxHeight: '72%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.ink,
  },
  pickerSearch: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.paperSoft,
  },
  pickerList: {
    maxHeight: 320,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  pickerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  pickerEmpty: {
    textAlign: 'center',
    color: Brand.inkMuted,
    paddingVertical: 28,
  },
  projectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    marginBottom: 8,
    backgroundColor: Brand.paper,
  },
  projectOptionActive: {
    borderColor: Brand.ink,
    backgroundColor: Brand.paperSoft,
  },
  projectOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectOptionIconActive: {
    backgroundColor: Brand.ink,
  },
  projectOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  projectOptionMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkMuted,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    paddingHorizontal: 24,
  },
  busyCard: {
    backgroundColor: Brand.paper,
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    minWidth: 180,
  },
  busyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: Brand.ink,
  },
  existsCard: {
    backgroundColor: Brand.paper,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  existsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  existsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.ink,
    marginBottom: 8,
  },
  existsBody: {
    fontSize: 14,
    color: Brand.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  existsBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  existsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default SelectUserModal;
