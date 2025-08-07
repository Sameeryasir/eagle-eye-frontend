import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function CustomBottomNav({ keyboardVisible = false, task = false, projectId = null }) {
  const navigation = useNavigation();

  const handleAddPress = () => {
    if (task) {
      navigation.navigate('CreateTask', { projectId: projectId });
    } else {
      navigation.navigate('CreateProject');
    }
  };
 const navigateToHome =()=>{
  navigation.navigate('HomeScreen')
 }
  // Hide the bottom navigation when keyboard is visible
  if (keyboardVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Bottom Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconButton} onPress={navigateToHome}>
          <Icon name="home-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Icon name="chatbubble-outline" size={24} color="#fff" />
          <View style={styles.activeIndicator} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.iconButton}>
          <Icon name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Icon name="person-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
          <Icon name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width,
    alignItems: 'center',
    zIndex: 1000,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: width * 0.9,
    height: 70,
    backgroundColor: 'black', // slightly transparent gray background
    borderRadius: 35,
    paddingHorizontal: 15,
    paddingBottom: 5,
    marginBottom: 20, // reduced from 25
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // reduced shadow
    shadowOpacity: 0.15, // reduced opacity
    shadowRadius: 4, // reduced radius
    elevation: 6, // reduced elevation
  },
  iconButton: {
    width: (width * 0.9 - 30) / 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spacer: {
    width: 65, // matches FAB width
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 45, // adjusted from 50
    zIndex: 1001,
  },
  fab: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // reduced shadow
    shadowOpacity: 0.2, // reduced opacity
    shadowRadius: 8, // reduced radius
    elevation: 8, // reduced elevation
    borderWidth: 3,
    borderColor: 'white', // outer ring of FAB
  },
});
