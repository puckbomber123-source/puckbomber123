import axios from 'axios';

interface TechnicianData {
  firstName: string;
  lastName: string;
  techId: string;
  pin: string;
}

export async function validateTechnician(techId: string, pin: string): Promise<TechnicianData | null> {
  try {
    const response = await axios.get(
      'https://sheets.googleapis.com/v4/spreadsheets/1FudNUP3xNIHdXIA0QkWcmDZnFF9KYhvWyrWC6tcCYII/values/Sheet1!A:D',
      {
        params: {
          key: import.meta.env.VITE_GOOGLE_API_KEY,
          majorDimension: 'ROWS',
          valueRenderOption: 'UNFORMATTED_VALUE'
        }
      }
    );

    const rows = response.data.values;
    if (!rows) return null;

    // Start from row 3 (index 2) and find matching technician
    const technician = rows.slice(2).find(row => row[2] === techId && row[3] === pin);
    
    if (!technician) return null;

    return {
      firstName: technician[0],
      lastName: technician[1],
      techId: technician[2],
      pin: technician[3]
    };
  } catch (error: any) {
    console.error('Error validating technician:', error);
    if (error.response) {
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    return null;
  }
}