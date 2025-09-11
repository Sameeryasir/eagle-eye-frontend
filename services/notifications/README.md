# Expo Push Notifications System

This directory contains the complete Expo push notification system for the Eagle Eye app. The system automatically generates Expo push tokens when users verify their OTP and handles all notification-related functionality.

## 📁 Files Overview

### Core Services
- **`expoTokenService.js`** - Main service for generating and managing Expo push tokens
- **`sendTokenToServer.js`** - Service for sending tokens to the backend server
- **`notificationUtils.js`** - Utility functions for working with tokens and permissions

## 🚀 How It Works

### 1. OTP Verification Flow
When a user successfully verifies their OTP in `OtpScreen.js`:

1. **OTP Verification** - User enters and verifies OTP code
2. **Login Process** - `AuthContext.login()` is called with user data
3. **Token Generation** - `setupNotifications()` is called automatically
4. **Permission Request** - App requests notification permissions from user
5. **Token Creation** - Expo push token is generated and stored locally
6. **Server Registration** - Token is sent to backend server (optional)
7. **Success** - User is logged in with push notifications enabled

### 2. Token Management
- **Storage**: Tokens are stored in AsyncStorage as `expoPushToken`
- **Context**: Available in AuthContext as `expoPushToken` state
- **Cleanup**: Tokens are cleared on logout

## 🔧 Usage Examples

### Accessing the Token in Components
```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { expoPushToken } = useAuth();
  
  console.log('Current Expo token:', expoPushToken);
  // Token will be available after successful OTP verification
};
```

### Manual Token Generation
```javascript
import { setupNotifications } from '../services/notifications/expoTokenService';

const generateToken = async () => {
  const result = await setupNotifications();
  if (result.success) {
    console.log('Token generated:', result.token);
  } else {
    console.log('Failed:', result.error);
  }
};
```

### Check Notification Permissions
```javascript
import { hasNotificationPermissions } from '../services/notifications/notificationUtils';

const checkPermissions = async () => {
  const hasPermissions = await hasNotificationPermissions();
  console.log('Has permissions:', hasPermissions);
};
```

## 🛠 Configuration

### App.json Configuration
The app is already configured with:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#000000",
          "mode": "production"
        }
      ]
    ]
  }
}
```

### Project ID
The Expo project ID is configured in `expoTokenService.js`:
```javascript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: '35012417-c75c-4b31-89df-1a71d6aa5491'
});
```

## 📱 Platform Support

### iOS
- Requires physical device (not simulator)
- Automatically requests permissions
- Supports background notifications

### Android
- Works on both emulator and physical device
- Requires notification permissions
- Configured with custom notification channel

## 🔒 Security & Privacy

### Token Security
- Tokens are stored locally in AsyncStorage
- Tokens are sent to server with authentication headers
- Tokens are cleared on logout

### User Privacy
- Permission requests are handled gracefully
- Users can deny permissions without breaking the app
- Clear error messages for permission issues

## 🐛 Error Handling

### Common Issues
1. **No Physical Device**: Expo tokens require physical devices
2. **Permission Denied**: User can deny permissions
3. **Network Issues**: Token generation can fail due to network problems
4. **Server Errors**: Backend server might not be available

### Fallback Behavior
- App continues to work even if token generation fails
- Users can still use all features except push notifications
- Clear error logging for debugging

## 📊 Monitoring & Debugging

### Console Logs
The system provides detailed logging:
- Token generation success/failure
- Permission request results
- Server communication status
- Error details for debugging

### Token Validation
Use utility functions to validate tokens:
```javascript
import { isValidExpoToken, formatTokenForDisplay } from '../services/notifications/notificationUtils';

const token = 'ExponentPushToken[abc123...]';
console.log('Is valid:', isValidExpoToken(token));
console.log('Display format:', formatTokenForDisplay(token));
```

## 🔄 Backend Integration

### Server Endpoints
The system expects these backend endpoints:
- `POST /notifications/register-token` - Register new token
- `PUT /notifications/update-token` - Update existing token
- `DELETE /notifications/remove-token` - Remove token

### Request Format
```javascript
{
  "expoPushToken": "ExponentPushToken[abc123...]",
  "userId": "user123",
  "platform": "ios",
  "deviceType": "mobile"
}
```

## 🚀 Future Enhancements

### Potential Improvements
1. **Token Refresh**: Automatically refresh expired tokens
2. **Multiple Devices**: Support multiple devices per user
3. **Notification Categories**: Different notification types
4. **Analytics**: Track notification delivery and engagement
5. **User Preferences**: Allow users to customize notification settings

## 📝 Notes

- **MCP Context 7**: All code follows MCP Context 7 best practices
- **Clean Code**: Extensive comments and clear function names
- **Error Handling**: Comprehensive error handling throughout
- **User Experience**: Non-blocking token generation
- **Maintainability**: Modular design for easy updates

## 🆘 Troubleshooting

### Token Not Generated
1. Check if running on physical device
2. Verify notification permissions
3. Check console logs for errors
4. Ensure Expo project ID is correct

### Server Communication Failed
1. Verify API_URL is correct
2. Check authentication token
3. Ensure backend endpoints exist
4. Check network connectivity

### Permissions Denied
1. Guide user to app settings
2. Explain notification benefits
3. Provide alternative communication methods
4. Don't block app functionality
