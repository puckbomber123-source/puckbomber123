interface ServiceData {
  technician_id: string;
  client_email: string;
  service_type: string;
  service_date: string;
  notes: string;
  photo_urls?: string[];
}

export async function submitServiceData(data: ServiceData): Promise<boolean> {
  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbw0Z8Rn_3sUoSn5uHeV4bA5PCCEUVmC-3hb7GbQVYjxXKIVGlfN_O/exec',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to submit service data');
    }

    return true;
  } catch (error) {
    console.error('Error submitting service data:', error);
    return false;
  }
}