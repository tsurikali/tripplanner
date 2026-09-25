import axios from 'axios';

const YANDEX_MAPS_API_KEY = process.env.YANDEX_MAPS_API_KEY || '';

interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    console.log('🔍 Геокодирование адреса:', address);
    console.log('🔑 Используем ключ:', YANDEX_MAPS_API_KEY ? '✅ ключ загружен' : '❌ ключ отсутствует');

    if (!YANDEX_MAPS_API_KEY) {
      console.error('❌ Ключ API не найден в .env файле');
      return null;
    }

    const response = await axios.get('https://geocode-maps.yandex.ru/1.x/', {
      params: {
        geocode: address,
        apikey: YANDEX_MAPS_API_KEY,
        format: 'json',
        lang: 'ru_RU',
        results: 1
      }
    });

    console.log('📦 Ответ от Яндекса получен');

    const featureMember = response.data.response?.GeoObjectCollection?.featureMember;
    
    if (featureMember && featureMember.length > 0) {
      const firstResult = featureMember[0];
      const pos = firstResult.GeoObject.Point.pos.split(' ');
      const lng = parseFloat(pos[0]);
      const lat = parseFloat(pos[1]);
      const formattedAddress = firstResult.GeoObject.name + ', ' + firstResult.GeoObject.description;
      
      console.log('✅ Успешно! Координаты:', { lat, lng });
      return { lat, lng, formattedAddress };
    }
    
    console.log('⚠️ Адрес не найден в Яндексе');
    return null;
  } catch (error: any) {
    console.error('❌ Ошибка геокодирования:', error.message);
    if (error.response) {
      console.error('Статус ответа:', error.response.status);
      console.error('Данные ответа:', error.response.data);
    }
    return null;
  }
}