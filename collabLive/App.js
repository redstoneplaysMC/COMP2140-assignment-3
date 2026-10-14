import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';

// Import necessary modules from React, React Native, and Expo
import React, { useState } from "react";
import { StyleSheet, View, Image, Dimensions, Button } from "react-native";
import * as ImagePicker from 'expo-image-picker';

// Get the screen width and height for styling
const { height } = Dimensions.get("window");

export default function App() {
  const htmlContent = `
    <html>
    <head>
        <title>WebView Example</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; font-size: 18px; }
        h1 { color: #2E86C1; font-size: 28px; }
        p { font-size: 18px; }
        img { max-width: 50%; height: auto; margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>Hello from WebView</h1>
        <p>This is a detailed HTML example with various tags.</p>
    </body>
    </html>
    `;
    // <p>Here is an image embedded using base64 encoding:</p>
    // <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAGKDAGaAAAFgUlEQVRYw7WXa2wUVRTH/20p7fZBW0p5iAplaUELCqEFlUCMYKwJKMYgaEwIUpQYNCIWRYgvQtTS6AeiKEqIQDBIAEFAEEm1DUVUoIqPVqhCC/IoammhC9vt/vywM7szu7NLLfHMl7n3nP/533vuPefMSHap8wNIoG57pxIYSErZDyCgB8qogTYUeKT+v2C+SlLanqA3v4EBwSdAasAI4CUUcA7wRsiBMbDIjQDQd4M0ogimtkrbMWSgAVzibUIouTIwfc4kJaVIkpT+PTxLiGplkHCo6Wq+uSOydlrYl3jD1xOSAQ5zdzcA1CJJK/ygOEk91kIhAMsQmeMDq9MRg7ojGExIINkrOAm8D4DHSg9QwiQApiDmeQzFWaDE2LUQ4DXjedimsAQaShgbqXj4NM4ISZpmVeTbdt6vGISrWtElfs76Fuig9+9hij7qFjbTs6GecEnxSdKa4DjbK0nFrzWFTI4yE/jVsvDsMaauP0JxX0ARviBgOg0A3GnZaVpO4N3llZRYYZrez8dhC/KRxrBVYSt37TPVgSh6GQN8FFxSQPLOqbsBSP3Wy2gLwJIRQcC91mPIOGyaTaTKARBxbllH7EtqZkJsgCRlvrTbF21JQiS3KN7pkFNH/BMOiJ+nq8vQTTNI8ChZnZabXJs7bxzf9zjAO/8kTLfNxynXwTpze6PlnG8/o16B+fzTfqCRgq1W62nXtYff1X1orjRiqzn2M8TgySlqAFjNuqDxFdIRKpWeag/Vo7zfJWXXei1ep3AaKDYDWypNvhLQnETk1+kWf/hC3iUrdGil0i3lAE8iRM/r1cpm3g0aNzAdgB8sACnvm8Bo0AuSLgLwKMeBQjosTEuCAJu0BSPgjsjo5WS0KyUM4Amqf6aO2cFRPUKU0cLAOhvgsgUAUM4u/PQz9lAGwC5/75eDgFlhAHuxKzNmynGtMwDtvMWOmIBahEjbYAACBWYCzY6A18kx3jI2WXolQJvRKMLqb6g5bbO0AnMPlbwSFdBrpwMA4FkOOwJ6mw08q/J8jChZnhtCR9HdfTo2IP6JyGQrfKbVGZBeETWdB723PwzQ/ZISr1IDchs9IcCtnasbWWMvCC3SNUhm2ophJ2raq9pyjycvjbju1yTje/604IzHllMXmH0256BGRBoPTipaO/jv4ktTPaNaC+rd02I5dqUsdTdUXiaGfOYbdKbPi2bnLkjLO3cszGJx+00fRLoemXlg1qkLVDOOxVyM6v4MM4kLlpQh6cObI22OIcatNh0nJj3X/8S2S3aTFhZwJ9/Z5raTZ71npZKUOWVxhPtDuBD5jZI7c+8DJ8/Giga7GcObzCMxMkFKJWlUYm6ztU0cYbihH7lccbv3cw9z+Tuq+yrG8gptNDGHBEcCSXGDjz7NDG6zWQyYLylhTyDSl1nK7VRYHLfxKmOpjCDcaH5dR5T1obPddekel9f95/BPs/ubwa+wB76acTzPRJ6hOWbYGnkEEb/wqlc96eu2CHAJ1cznLg5Fdf8lBQjxBqv87qbcx2MQJFd5HAjMyrSD0bxN6ABbWUiSQ9f4jQnNA7epjwNBSvWVGATmrX+M+xjjUGbLbHbtLLvU7w/dYf/0OrCV0ZTjjUEQ/WOxzJYh+QiRut5GkP6dz/jBms0kartA0ByWIekbbQQ9DnXYHG2gkIJOE7gc5jK32AgyavwOZ/A504N/AjG/px2entvtxf5Hoh5yByspZMN/JMjZbQ/RwRrf1W5RLZMY3Pkd7Ii8q5N71y9rae/CLbI/PY5qfKyk7ttvy13nj3aBIN6XslwZnW2TcX1KMlre8vk7RZB6QsVd7ccD3dUPXTwVhSCuI+lD80fi2iQhb1H+X5ssBEmn9KD+B7k54yut0XX/HfgvpUkmTvPggOsAAAAASUVORK5CYII=" alt="Base64 Example Image"/>

    const [photoState, setPhotoState] = useState({});

    // Function to handle photo selection using the Image Picker
  const handleChangePress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhotoState(result.assets[0]);
    }
  };
  // Function to remove the selected photo
  async function handleRemovePress() {
      setPhotoState({});
  }

  const hasPhoto = Boolean(photoState.uri);

  // Component to display the selected photo or a placeholder
  function Photo() {
      if (hasPhoto) {
          return (
              <View style={styles.photoFullView}>
                  <Image
                      style={styles.photoFullImage}
                      resizeMode="cover"
                      source={{ uri: photoState.uri }}
                  />
              </View>
          );
      } else {
          return <View style={styles.photoEmptyView} />;
      }
  }
  const initialRegion = {
    latitude: -27.4975,  // UQ St Lucia Campus
    longitude: 153.0137,
    latitudeDelta: 0.01, // campus-level zoom
    longitudeDelta: 0.01,
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.webViewContainer}>
        <View style={styles.webViewContainer}>
          <WebView
            style={styles.webView}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
          />
        </View>

        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map}
            initialRegion={initialRegion}
          >
            <Marker
              coordinate={{ latitude: initialRegion.latitude, longitude: initialRegion.longitude }}
              title="UQ St Lucia Campus"
              description="University of Queensland, St Lucia Campus"
            />
          </MapView>
        </View>

        <View style={styles.photoContainer}>
          <Photo />

          <View style={styles.buttonView}>
            <Button
              onPress={handleChangePress}
              title={hasPhoto ? "Change Photo" : "Add Photo"}
            />

            {hasPhoto && (
              <Button
                onPress={handleRemovePress}
                title="Remove Photo"
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// Define the styles for the components
const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    padding: 16,
  },
  photoFullView: {
    width: 300,
    height: 250,
    marginBottom: 10,
    overflow: 'hidden',
  },
  photoFullImage: {
    width: '100%',
    height: '100%',
  },
  photoEmptyView: {
    width: 200,
    height: 200,
    backgroundColor: '#eee',
    marginBottom: 10,
  },
  buttonView: {
    flexDirection: 'row',
    gap: 10,
  },
  mapContainer: {
    height: 250,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});