const net = require('net');
const axios = require('axios');
const moment = require('moment');


async function reverseGeocode(latitude, longitude) {
  const geocodingUrl = `http://address.markongps.in/nominatim/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  try {
    const response = await axios.get(geocodingUrl);
    const displayName = response.data.display_name; // Extract display_name from the response
    return displayName;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
}

function parseData(rawData) {
  // Extract information from the raw data
  const packetType = rawData.slice(0, 2);
  const id = rawData.slice(2, 12);
  const protocolType = rawData.slice(12, 14);
  const deviceType = rawData.slice(14, 15);
  const dataType = rawData.slice(15, 16);
  const packetLength = parseInt(rawData.slice(16, 20), 16);
  const date = rawData.slice(20, 26);
  const time = rawData.slice(26, 32);
  const latitude = rawData.slice(32, 40);
  const longitude = rawData.slice(40, 49);
  const directionIndicator = rawData.slice(49, 50);
  const speed = rawData.slice(50, 52);
  const direction = rawData.slice(52, 54);
  const mileage = parseInt(rawData.slice(54, 62), 16);
  const satellite = rawData.slice(62, 64);
  const vehicleNumber = rawData.slice(64, 72);
  const deviceStatus = rawData.slice(72, 76);
  const batteryLevel = parseInt(rawData.slice(76, 78), 16);
  const cellID = rawData.slice(78, 86);
  const gsmSignal = rawData.slice(86, 88);
  const fenceAlarm = rawData.slice(88, 90);
  const expandDeviceStatus = rawData.slice(90, 92);
  const reserved = rawData.slice(92, 94);
  const imeiReserved = rawData.slice(94, 112);
  const cellID2 = rawData.slice(112, 116);
  const mcc = rawData.slice(116, 120);
  const mnc = rawData.slice(120, 122);
  const dataFrameNumber = parseInt(rawData.slice(122, 124), 16);

  function convertLatToDecimal(lat) {
    const latDegrees = Math.floor(lat / 1000000);
    const latMinutes = ((lat % 1000000) / 10000) / 60.0;
    return latDegrees + latMinutes;
  }

  function convertLonToDecimal(lon) {
    const lonDegrees = Math.floor(lon / 1000000);
    const lonMinutes = ((lon % 1000000) / 10000) / 60.0;
    return lonDegrees + lonMinutes;
  }

  const latitudeDecimal = convertLatToDecimal(parseInt(latitude, 10));
  const longitudeDecimal = convertLonToDecimal(parseInt(longitude, 10));

  return {
    packetType,
    id,
    protocolType,
    deviceType,
    dataType,
    packetLength,
    date,
    time,
    latitudeDecimal: parseFloat((latitudeDecimal).toFixed(6)),
    latitude,
    longitudeDecimal: parseFloat((longitudeDecimal).toFixed(6)),
    longitude,
    directionIndicator,
    speed,
    direction,
    mileage,
    satellite,
    vehicleNumber,
    deviceStatus,
    batteryLevel,
    cellID,
    gsmSignal,
    fenceAlarm,
    expandDeviceStatus,
    reserved,
    imeiReserved,
    cellID2,
    mcc,
    mnc,
    dataFrameNumber,
  };
}



const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', async  (data) => {
    
    const rawData = data.toString('hex');

    if (rawData.startsWith('24')) {
      const parsedData = parseData(rawData);

      const packetType = parsedData.packetType;
      const dataFrameNumber = parsedData.dataFrameNumber;

      const response = `(P69,0,${dataFrameNumber})`;
      console.log('Response:', response);
      console.log('Received Data:', parsedData);

       const formattedDate = moment(parsedData.date, 'DDMMYY').format('YYYY-MM-DD');
      const formattedTime = moment(parsedData.time, 'HHmmss').format('HH:mm:ss');

      const deviceStatus = parsedData.deviceStatus;

      //const timestamp = `${parsedData.date} ${parsedData.time}`;
      const timestamp = `${formattedDate} ${formattedTime}`;
      const vin = parsedData.vehicleNumber.trim(); // Trim to remove leading/trailing spaces

      const deviceStatusHex = deviceStatus.toString('hex'); // Convert the buffer to a hex string
     // const deviceStatusBinary = parseInt(deviceStatusHex, 16).toString(2); // Convert to binary
     const deviceStatusBinary = parseInt(parsedData.deviceStatus, 16).toString(2).padStart(16, '0');

      // Map binary values to fields
      // Map binary values to fields
    // Map binary values to fields
const mappedData = {
    'id': parsedData.id,
    'latitude': parsedData.latitudeDecimal,
    'longitude': parsedData.longitudeDecimal,
    'batteryLevel': parsedData.batteryLevel,
    'timestamp': timestamp,
    'vin': vin,
    'speed': parsedData.speed,
    'odometer': parsedData.mileage,
    'geofenceEnter': deviceStatusBinary.charAt(15),
    'geofenceExit': deviceStatusBinary.charAt(14),
    'powerCut': deviceStatusBinary.charAt(13),
    'vibration': deviceStatusBinary.charAt(12),
    'fallDown': deviceStatusBinary.charAt(11),
    'ignition': deviceStatusBinary.charAt(10),
    'jamming': deviceStatusBinary.charAt(9),
    'tow': deviceStatusBinary.charAt(8),
    'removing': deviceStatusBinary.charAt(7),
    'lowBattery': deviceStatusBinary.charAt(6),
    'tampering': deviceStatusBinary.charAt(5),
    'powerRestored': deviceStatusBinary.charAt(4),
    'fault': deviceStatusBinary.charAt(3),
    'bit14': deviceStatusBinary.charAt(2),
    'bit15': deviceStatusBinary.charAt(1),
    'bit16': deviceStatusBinary.charAt(0),
  };


  const displayName = await reverseGeocode(mappedData.latitude, mappedData.longitude);
      if (displayName) {
        mappedData.address = displayName; // Use display_name in mappedData
      } else {
        console.error('Error obtaining display_name from reverse geocoding.');
      }


      console.log('Mapped Data:', mappedData);

      const postData = {
        id: mappedData.id,
        latitude: mappedData.latitude,
        longitude: mappedData.longitude,
        batteryLevel: mappedData.batteryLevel,
        timestamp: mappedData.timestamp,
        vin: mappedData.vin,
        geofenceEnter: mappedData.geofenceEnter,
        geofenceExit: mappedData.geofenceExit,
        powerCut: mappedData.powerCut,
        vibration: mappedData.vibration,
        fallDown: mappedData.fallDown,
        ignition: mappedData.ignition,
        jamming: mappedData.jamming,
        tow: mappedData.tow,
        removing: mappedData.removing,
        lowBattery: mappedData.lowBattery,
        tampering: mappedData.tampering,
        powerRestored: mappedData.powerRestored,
        fault: mappedData.fault,
        bit14: mappedData.bit14,
        bit15: mappedData.bit15,
        bit16: mappedData.bit16,
        address: mappedData.address,

      };

      if (parsedData.dataType === '2'){
      const additionalUrl = 'https://gpspackseal.in/api/push_data';

      // Configure request options
      const requestOptions = {
        method: 'post',
        maxBodyLength: Infinity,
        url: additionalUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: postData
      };

      // Make the additional URL request
      axios(requestOptions)
        .then((response) => {
          console.log('Additional URL data posted successfully:', response.data);
        })
        .catch((error) => {
          console.error('Error posting additional URL data:', error);
        });


     }

      // Check the 7th bit (0-based index)
        const seventhBit = deviceStatusBinary[deviceStatusBinary.length - 7];

     // Determine the lock state
     const lockState = seventhBit === '0' ? 'unlock' : 'lock';

      const lockAlert = seventhBit === '0' ? 'true' : 'false';


      const url = `http://45.79.121.28:9035/?id=${parsedData.id}&lat=${parseFloat(parsedData.latitudeDecimal.toFixed(6))}&lon=${parseFloat(parsedData.longitudeDecimal.toFixed(6))}&batteryLevel=${parsedData.batteryLevel}&timestamp=${formattedDate} ${formattedTime}&vin=${parsedData.vehicleNumber}&speed=${parsedData.speed}&odometer=${parsedData.mileage}&lock=${lockState}&ignition=${lockAlert}`;

      axios
        .post(url)
        .then((response) => {
          console.log('Raw Data posted successfully:', response.data);
        })
        .catch((error) => {
          console.error('Error posting raw data:', error);
        });

      socket.write(response);


    } else if (rawData.startsWith('283830')) {
      
      const asciiData = Buffer.from(rawData.slice(2, -2), 'hex').toString('ascii');
      console.log('Converted Ascii data:', asciiData);

      const parts = asciiData.split(',');

      async function reverseGeocode(latitude, longitude) {
        const geocodingUrl = `http://address.markongps.in/nominatim/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        try {
          const response = await axios.get(geocodingUrl);
          const displayName = response.data.display_name; // Extract display_name from the response
          return displayName;
        } catch (error) {
          console.error('Error in reverse geocoding:', error);
          return null;
        }
      }

      const id = parts[0];       
      const command_word = parts[1];
      const date = parts[2];
      const timestamp = parts[3];
      const latitude = parts[4];
      const longitude = parts[6];
      const speed = parts[9];
      const direction = parts[10];
      const event_source_type = parts[11];
      const unlock_verification = parts[12];
      const rfid_card_number = parts[13];
      const password_verification = parts[14];
      const incorrect_password = parts[15];
      const event_serial_number = parts[16];
      const mileage = parts[17];
      const fenceid = parts[19];
      const serialNumber = parts[16];
      const response = `(P69,0,${serialNumber})`;
      console.log('Response:', response);
      socket.write(response);

        
      const formattedDate = moment(date, 'DDMMYY').format('YYYY-MM-DD');
      const formattedTime = moment(timestamp, 'HHmmss').format('HH:mm:ss');


      const time = `${formattedDate} ${formattedTime}`;

      const mappedData = {
        'id': id,
        'command_word':command_word,
        'date': date,
        'time': time,
        'latitude': latitude,
        'longitude': longitude,
        'speed': speed,
        'direction': direction,
        'event_source_type': event_source_type,
        'unlock_verification': unlock_verification,
        'rfid_card_number': rfid_card_number,
        'password_verification': password_verification,
        'incorrect_password': incorrect_password,
        'event_serial_number': event_serial_number,
        'mileage': mileage,
        'fenceid': fenceid,
      };
 
      const displayName = await reverseGeocode(mappedData.latitude, mappedData.longitude);
      if (displayName) {
        mappedData.address = displayName; // Use display_name in mappedData
      } else {
        console.error('Error obtaining display_name from reverse geocoding.');
      }

          console.log('Mapped Data:', mappedData);

          const postData = {
            id: mappedData.id,
            command_word: mappedData.command_word,
            date: mappedData.date,
            time: mappedData.time,
            latitude: mappedData.latitude,
            longitude: mappedData.longitude,
            speed: mappedData.speed,
            direction: mappedData.direction,
            event_source_type: mappedData.event_source_type,
            unlock_verification: mappedData.unlock_verification,
            rfid_card_number: mappedData.rfid_card_number,
            password_verification: mappedData.password_verification,
            incorrect_password: mappedData.incorrect_password,
            event_serial_number: mappedData.event_serial_number,
            mileage: mappedData.mileage,
            fenceid: mappedData.fenceid,
            address: mappedData.address,

          };



      const additionalUrl = 'https://gpspackseal.in/api/push_data_event';

      // Configure request options
      const requestOptions = {
        method: 'post',
        maxBodyLength: Infinity,
        url: additionalUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: postData
      };

      // Make the additional URL request
      axios(requestOptions)
        .then((response) => {
          console.log('Additional URL data posted successfully:', response.data);
        })
        .catch((error) => {
          console.error('Error posting additional URL data:', error);
        });

    }

        console.log('Received Data:', rawData);
    });


  socket.on('end', () => {
    console.log('Client disconnected');
  });
});


server.listen(8092, () => {
  console.log('######### Server listening on port 8092 ###############');
});
