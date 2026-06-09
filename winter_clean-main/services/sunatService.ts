
const API_TOKEN = "sk_11867.t8kBVOUaeNsEQgur18EEGVWOKner1ces";
const BASE_URL = "https://api.decolecta.com/v1";

export interface SunatResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const searchDni = async (dni: string): Promise<SunatResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/reniec/dni?numero=${dni}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    
    // Construct full name based on documentation
    const fullName = data.full_name || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`;

    return { 
      success: true, 
      data: {
        name: fullName.trim(),
      } 
    };

  } catch (error) {
    console.warn("Error fetching DNI (Using Fallback Mock):", error);
    // Fallback for demo/offline mode
    return { 
      success: true, 
      data: {
        name: `Cliente Demo (${dni})`,
      } 
    };
  }
};

export const searchRuc = async (ruc: string): Promise<SunatResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/sunat/ruc?numero=${ruc}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    // Construct address from available fields
    let address = data.direccion || '';
    if (data.distrito && data.provincia) {
        address += ` - ${data.distrito}, ${data.provincia}`;
    }

    return { 
      success: true, 
      data: {
        name: data.razon_social,
        address: address,
        condition: data.condicion,
        status: data.estado
      } 
    };

  } catch (error) {
    console.warn("Error fetching RUC (Using Fallback Mock):", error);
    // Fallback for demo/offline mode
    return { 
      success: true, 
      data: {
        name: `Empresa Demo S.A.C. (${ruc})`,
        address: 'Av. Industrial 123, Lima - Demo',
        condition: 'HABIDO',
        status: 'ACTIVO'
      } 
    };
  }
};
