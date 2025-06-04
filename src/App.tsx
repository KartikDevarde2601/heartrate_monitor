// App.tsx
import React from 'react';
import { useEffect ,useState} from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
  Text,
  Button,
  Card,
  Surface,
} from 'react-native-paper';
import { BLEService } from "./BLEService"
import { Device } from 'react-native-ble-plx';



const HEART_RATE_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
const HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID = "00002a37-0000-1000-8000-00805f9b34fb"


export default function App() {
  const [connected, setConnected] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false)
  const [deviceName,setdeviceName] = useState<string>('ESP32 HeartRate')

   useEffect(() => {
    //STEP = 01
    //Request android to give permission for Bluetooth
    BLEService.requestBluetoothPermission()
  }, [])


  useEffect(() => {
    const discoverDeviceServices = async () => {
      if (BLEService.device) {
        setIsProcessing(true)
        console.log(
          `Discovering services for device: ${BLEService.device.id || BLEService.device.name}`,
        )
        try {
          await BLEService.device.discoverAllServicesAndCharacteristics()
          console.log("Services and characteristics discovered successfully.")
        } catch (e: any) {
          console.error("Service discovery error:", e)
          console.log(`Discovery Error: ${e.message || "Unknown error during discovery"}`)
        } finally {
          setIsProcessing(false)
        }
      } else {
        console.log("Something went wrong")
      }
    }

    if (BLEService.device) {
      discoverDeviceServices()
    }

    return () => {
      BLEService.finishMonitor()
    }
  }, [BLEService.device])

  const onDeviceFund = async(device:Device)=> {
     if(device.name == deviceName){
      const Device = await BLEService.connectToDevice(device.id)
      if(Device){
      BLEService.onDeviceDisconnected(() => setConnected(false))
       setConnected(true)
      }
     }
  }


  // STEP 09
  // monitoring get value continously
  const toggleMonitoring = async () => {
  
    setIsProcessing(true)
    if (monitoring) {
      BLEService.finishMonitor()
      setMonitoring(false)
      setHeartRate(null)
    } else {
      try {
        BLEService.setupMonitor(
          HEART_RATE_SERVICE_UUID,
          HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
          (characteristic) => {
            if (characteristic && characteristic.value) handleHeartRateData(characteristic.value)
          },
          (error) => {
            console.log('onMonitoring', error)
          },
        )
        setMonitoring(true)
      } catch (e: any) {
        console.log(`Failed to start: ${e.message}`)
        setMonitoring(false)
      }
    }
    setIsProcessing(false)
  }


   const handleHeartRateData = (base64Value: string) => {
    try {
      const rawData = atob(base64Value)
      const byteArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; i++) {
        byteArray[i] = rawData.charCodeAt(i) & 0xff
      }
      if (byteArray.length === 0) return
      const flags = byteArray[0]
      const isUINT16 = (flags & 0x01) !== 0
      let hrValue: number
      if (isUINT16) {
        if (byteArray.length < 3) return
        const buffer = byteArray.buffer.slice(byteArray.byteOffset + 1, byteArray.byteOffset + 3)
        const view = new DataView(buffer)
        hrValue = view.getUint16(0, true)
      } else {
        if (byteArray.length < 2) return
        hrValue = byteArray[1]
      }
      // STEP = 11
      // set value in UI
      setHeartRate(hrValue)
    } catch (e) {
      console.error("Failed to parse heart rate data:", e)
      console.log("Error parsing heart rate data.")
    }
  }


  const connectToDevice =  async() => {
   await BLEService.scanDevices(
   onDeviceFund
   )
    
  };

  return (
    <PaperProvider theme={DefaultTheme}>
      <View style={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          Heart Rate Monitor
        </Text>

        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="headlineLarge" style={styles.heartRateText}>
              {heartRate ? `${heartRate} BPM` : '-- BPM'}
            </Text>
            <Text variant="labelLarge" style={styles.subText}>
              {monitoring ? 'Monitoring...' : connected ? 'Ready to monitor' : 'Disconnected'}
            </Text>
          </Card.Content>
        </Card>

        <Surface style={styles.buttonContainer} elevation={4}>
          <Button
            mode="contained"
            onPress={connectToDevice}
            style={styles.button}
            buttonColor={connected ? '#ccc' : DefaultTheme.colors.primary}
            disabled={connected}
            icon="bluetooth-connect"
          >
            {connected ? 'Connected' : 'Connect'}
          </Button>

          <Button
            mode="contained-tonal"
            onPress={toggleMonitoring}
            style={styles.button}
            disabled={!connected}
            icon="heart-pulse"
          >
            {monitoring ? 'stop monitor':'start monitor'}
          </Button>
        </Surface>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
    fontWeight:'bold'
  },
  card: {
    borderRadius: 20,
    marginBottom: 32,
    paddingVertical: 20,
  },
  heartRateText: {
    textAlign: 'center',
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  subText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#555',
  },
  buttonContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap', 
  paddingVertical: 16,
  borderRadius: 16,
  backgroundColor: '#fff',
  gap: 16, 
},
  button: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 10,
  },
});
