import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Alert, PermissionsAndroid, Platform, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import axios from 'axios';
import Svg, { Path } from 'react-native-svg'; // SVGのインポート

const requestCameraPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera permission to take pictures',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

const MainApp = () => {
  const [authType, setAuthType] = useState<string>('root');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [operatorId, setOperatorId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [filePath, setFilePath] = useState<string>('');
  const [isCallbackInvoked, setIsCallbackInvoked] = useState<boolean>(false);

  const authenticate = async () => {
    const requestBody: any = {};

    if (authType === 'root') {
      if (!email || !password) {
        Alert.alert('Error', 'Email and Password are required');
        return;
      }
      requestBody.email = email;
      requestBody.password = password;
    } else {
      if (!password || !operatorId || !userName) {
        Alert.alert('Error', 'Password, Operator ID and User Name are required for SAM user');
        return;
      }
      requestBody.password = password;
      requestBody.operatorId = operatorId;
      requestBody.userName = userName;
    }

    try {
      const response = await axios.post('https://api.soracom.io/v1/auth', requestBody);
      setApiKey(response.data.apiKey);
      setToken(response.data.token);
      Alert.alert('Success', 'Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error.response?.data || error.message || error);
      Alert.alert('Error', `Authentication failed: ${error.response?.data.message || error.message}`);
    }
  };

  const logout = async () => {
    if (!apiKey || !token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    try {
      await axios.post('https://api.soracom.io/v1/auth/logout', null, {
        headers: {
          'X-Soracom-API-Key': apiKey,
          'X-Soracom-Token': token,
        },
      });
      setApiKey(undefined);
      setToken(undefined);
      Alert.alert('Success', 'Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message || error);
      Alert.alert('Error', `Logout failed: ${error.response?.data.message || error.message}`);
    }
  };

  const selectImage = async () => {
    if (!apiKey || !token) {
      Alert.alert('Error', 'Please authenticate first');
      return;
    }

    const hasCameraPermission = await requestCameraPermission();
    if (!hasCameraPermission) {
      Alert.alert('Error', 'Camera permission is required to take photos');
      return;
    }

    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => {
            launchCamera(
              {
                mediaType: 'photo',
                includeBase64: false,
              },
              (response) => {
                handleImageResponse(response);
              }
            );
          },
        },
        {
          text: 'Photo Library',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                includeBase64: false,
              },
              (response) => {
                handleImageResponse(response);
              }
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleImageResponse = (response: any) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
    } else if (response.errorCode) {
      console.log('ImagePicker Error: ', response.errorMessage);
    } else if (response.assets && response.assets.length > 0) {
      const uri = response.assets[0].uri;
      if (uri) {
        setImageUri(uri);
      }
    }
  };

  const uploadImage = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!filePath) {
      Alert.alert('Error', 'Please provide a file path');
      return;
    }

    setUploading(true);

    const fileName = imageUri.split('/').pop() ?? 'default.jpg';
    const uploadUrl = `https://api.soracom.io/v1/files/private/${filePath}/${fileName}`;

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const binaryData = new Uint8Array(reader.result as ArrayBuffer);

        await axios.put(uploadUrl, binaryData, {
          headers: {
            'X-Soracom-API-Key': apiKey!,
            'X-Soracom-Token': token!,
            'Content-Type': blob.type,
          },
        });

        Alert.alert('Success', 'Image uploaded successfully');
      };
      reader.onerror = () => {
        console.error('FileReader error');
        Alert.alert('Error', 'File reading failed');
      };
      reader.readAsArrayBuffer(blob);

    } catch (error) {
      console.error('Upload failed:', error.response?.data || error.message || error);
      Alert.alert('Error', `Image upload failed: ${error.response?.data.message || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!apiKey || !token ? (
        <View style={styles.formContainer}>
          <Picker
            selectedValue={authType}
            style={styles.input}
            onValueChange={(itemValue) => setAuthType(itemValue)}
          >
            <Picker.Item label="Root User" value="root" />
            <Picker.Item label="SAM User" value="sam" />
          </Picker>
          {authType === 'root' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </>
          )}
          {authType === 'sam' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Operator ID"
                value={operatorId}
                onChangeText={setOperatorId}
              />
              <TextInput
                style={styles.input}
                placeholder="User Name"
                value={userName}
                onChangeText={setUserName}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </>
          )}
          <TouchableOpacity style={styles.button} onPress={authenticate}>
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Svg width="200" height="200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={styles.image}>
              <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="#34cdd7"/>
            </Svg>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={selectImage}>
              <Text style={styles.buttonText}>Select Image</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="File Path"
              value={filePath}
              onChangeText={setFilePath}
            />
            <TouchableOpacity
              style={[styles.button, (!imageUri || !filePath) && styles.buttonDisabled]}
              onPress={uploadImage}
              disabled={!imageUri || !filePath || uploading}
            >
              <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload Image'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={logout}>
              <Text style={styles.buttonText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#34cdd7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%', // ボタンの幅を100%に設定
  },
  buttonDisabled: {
    backgroundColor: '#b0e0e6',
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  signOutButton: {
    marginTop: 30, // Sign outボタンを他のボタンから離すためのマージン
  },
});

export default MainApp;
