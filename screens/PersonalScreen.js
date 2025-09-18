import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployeesToAssignTask } from '../services/employees/getEmployeesOfTheCompany';
import Loader from '../services/utils/loader';
import CustomBottomNav from './components/CustomBottomNav';
import Toast from 'react-native-toast-message';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function PersonalScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Load Employees Data (MCP Context 7) ---
  // Business Rule: Load all employees to display in personnel management screen
  useEffect(() => {
    loadEmployees();
  }, []);

  // --- Filter Employees Based on Search (MCP Context 7) ---
  // Business Rule: Allow managers to search employees by name and email for easier assignment
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(employee => {
        const firstName = employee.first_name?.toLowerCase() || '';
        const lastName = employee.last_name?.toLowerCase() || '';
        const email = employee.email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        
        return firstName.includes(query) || 
               lastName.includes(query) || 
               email.includes(query) ||
               `${firstName} ${lastName}`.includes(query);
      });
      setFilteredEmployees(filtered);
    }
  }, [employees, searchQuery]);

  const loadEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('PersonalScreen - Loading employees...');
      const employeesData = await getEmployeesToAssignTask();
      console.log('PersonalScreen - Employees data:', employeesData);
      console.log('PersonalScreen - Employees data type:', typeof employeesData);
      console.log('PersonalScreen - Is array?', Array.isArray(employeesData));

      if (Array.isArray(employeesData)) {
        console.log('PersonalScreen - Setting employees array with length:', employeesData.length);
        if (employeesData.length > 0) {
          console.log('PersonalScreen - First employee:', employeesData[0]);
        }
        setEmployees(employeesData);
        setFilteredEmployees(employeesData); // Initialize filtered list
      } else {
        console.error('PersonalScreen - Invalid employees data format:', employeesData);
        console.error('PersonalScreen - Expected array but got:', typeof employeesData);
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } catch (err) {
      console.error('PersonalScreen - Error loading employees:', err);
      setError('Failed to load employees. Please try again.');
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };


  const onRefresh = React.useCallback(() => {
    loadEmployees(true);
  }, []);




  // --- Employee Card Component (MCP Context 7) ---
  // Business Rule: Display employee information in a clean card format
  const EmployeeCard = ({ employee }) => {
    // Safety check: ensure employee object exists
    if (!employee || typeof employee !== 'object') {
      console.error('PersonalScreen - Invalid employee object:', employee);
      return null;
    }

    // Ensure we have valid string values for display
    const firstName = typeof employee.first_name === 'string' ? employee.first_name : '';
    const lastName = typeof employee.last_name === 'string' ? employee.last_name : '';
    const employeeEmail = typeof employee.email === 'string' ? employee.email : '';
    
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || employeeEmail || 'Unknown Employee';
    const email = employeeEmail || 'No email provided';
    
    // Debug logging to see the employee object structure
    console.log('PersonalScreen - Employee object:', employee);
    console.log('PersonalScreen - Display name:', displayName);
    console.log('PersonalScreen - Email:', email);

    return (
      <TouchableOpacity
        // --- Navigation with Employee ID (MCP Context 7) ---
        // Business Rule: Pass employee data and ID to ProjectAssignment screen
        onPress={() => navigation.navigate('ProjectAssignment', { 
          employee, 
          employeeId: employee.id
        })}
        style={{
          backgroundColor: 'white',
          borderRadius: Math.min(12, screenWidth * 0.03),
          padding: Math.min(12, screenWidth * 0.03),
          marginHorizontal: Math.min(20, screenWidth * 0.05),
          marginBottom: Math.min(8, screenHeight * 0.01),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 1,
          zIndex: 1,
          borderWidth: 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Person Icon - Smaller */}
          <View
            style={{
              width: Math.min(40, screenWidth * 0.1),
              height: Math.min(40, screenWidth * 0.1),
              borderRadius: Math.min(20, screenWidth * 0.05),
              backgroundColor: '#f8f9fa',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: Math.min(12, screenWidth * 0.03),
              borderWidth: 1,
              borderColor: '#e9ecef',
            }}
          >
            <Ionicons
              name="person"
              size={Math.min(18, screenWidth * 0.045)}
              color="#6c757d"
            />
          </View>

          {/* Employee Information - More Compact */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: Math.min(2, screenHeight * 0.0025),
                letterSpacing: 0.2,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              style={{
                fontSize: Math.min(12, screenWidth * 0.03),
                color: '#6c757d',
                fontWeight: '400',
                letterSpacing: 0.1,
                marginBottom: Math.min(4, screenHeight * 0.005),
              }}
              numberOfLines={1}
            >
              {email}
            </Text>
            
            {/* Role Badge - Smaller */}
            {employee.role && typeof employee.role === 'string' && (
              <View
                style={{
                  backgroundColor: '#e3f2fd',
                  paddingHorizontal: Math.min(6, screenWidth * 0.015),
                  paddingVertical: Math.min(2, screenHeight * 0.0025),
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: Math.min(10, screenWidth * 0.025),
                    color: '#1976d2',
                    fontWeight: '500',
                    letterSpacing: 0.1,
                  }}
                >
                  {employee.role}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };



  // --- Employee Search Bar Component (MCP Context 7) ---
  // Business Rule: Provide search functionality for employees
  const EmployeeSearchBar = () => (
    <View style={{ marginBottom: Math.min(16, screenHeight * 0.02) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: Math.min(12, screenWidth * 0.03),
          paddingHorizontal: Math.min(16, screenWidth * 0.04),
          paddingVertical: Math.min(12, screenHeight * 0.015),
          borderWidth: 1,
          borderColor: '#e9ecef',
        }}
      >
        <Ionicons
          name="search"
          size={Math.min(18, screenWidth * 0.045)}
          color="#6c757d"
          style={{ marginRight: Math.min(8, screenWidth * 0.02) }}
        />
        <TextInput
          style={{
            flex: 1,
            fontSize: Math.min(16, screenWidth * 0.04),
            color: '#333',
            paddingVertical: Math.min(4, screenHeight * 0.005),
          }}
          placeholder="Search by name or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons
              name="close-circle"
              size={Math.min(18, screenWidth * 0.045)}
              color="#6c757d"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );




  // --- Header Component (MCP Context 7) ---
  // Business Rule: Display screen title and search functionality
  const Header = () => (
    <View
      style={{
        backgroundColor: 'white',
        paddingHorizontal: Math.min(20, screenWidth * 0.05),
        paddingVertical: Math.min(20, screenHeight * 0.025),
      }}
    >
      {/* Employee Search Bar */}
      <EmployeeSearchBar />
    </View>
  );

  // --- Empty State Component (MCP Context 7) ---
  // Business Rule: Show appropriate message when no employees are found
  const EmptyState = () => {
    const isSearchEmpty = searchQuery.trim() !== '' && filteredEmployees.length === 0;
    const isNoEmployees = employees.length === 0;
    
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: Math.min(40, screenWidth * 0.1),
          paddingVertical: Math.min(60, screenHeight * 0.075),
        }}
      >
        <Ionicons
          name={isSearchEmpty ? "search-outline" : "people-outline"}
          size={Math.min(80, screenWidth * 0.2)}
          color="#ccc"
        />
        <Text
          style={{
            fontSize: Math.min(18, screenWidth * 0.045),
            fontWeight: '600',
            color: '#666',
            marginTop: Math.min(16, screenHeight * 0.02),
            marginBottom: Math.min(8, screenHeight * 0.01),
            textAlign: 'center',
          }}
        >
          {isSearchEmpty ? 'No Search Results' : 'No Employees Found'}
        </Text>
        <Text
          style={{
            fontSize: Math.min(14, screenWidth * 0.035),
            color: '#999',
            textAlign: 'center',
            lineHeight: Math.min(20, screenHeight * 0.025),
          }}
        >
          {isSearchEmpty 
            ? `No employees found matching "${searchQuery}". Try a different search term.`
            : error || 'No employees are currently registered in the system.'
          }
        </Text>
        
        {isSearchEmpty ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: Math.min(24, screenWidth * 0.06),
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(8, screenWidth * 0.02),
              marginTop: Math.min(16, screenHeight * 0.02),
            }}
            onPress={() => setSearchQuery('')}
          >
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Clear Search
            </Text>
          </TouchableOpacity>
        ) : error ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: Math.min(24, screenWidth * 0.06),
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(8, screenWidth * 0.02),
              marginTop: Math.min(16, screenHeight * 0.02),
            }}
            onPress={() => loadEmployees()}
          >
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // --- Loading State (MCP Context 7) ---
  // Business Rule: Show loading indicator while fetching employees
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Header />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Loader size="large" color="#000000" text="Loading employees..." />
        </View>
        <CustomBottomNav />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />

      {/* Employee List with Header */}
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => String(item.id || item.email || Math.random())}
        renderItem={({ item }) => <EmployeeCard employee={item} />}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{
          paddingBottom: Math.min(100, screenHeight * 0.125),
        }}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />


      {/* Bottom Navigation */}
      <CustomBottomNav />
    </View>
  );
}

export default PersonalScreen;