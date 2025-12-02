// server.js - Servidor Proxy CON AUTENTICACIÓN Y JOBID
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ TU COOKIE .ROBLOSECURITY (Necesaria para obtener gameId/JobId)
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE || '';

app.use(cors());
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Roblox Presence Proxy API v3 - Con JobId',
    authenticated: ROBLOX_COOKIE.length > 0,
    endpoints: {
      presence: '/api/presence/:userId',
      universeToPlace: '/api/universe/:universeId',
      test: '/api/test'
    }
  });
});

// Test
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando con JobId support!',
    authenticated: ROBLOX_COOKIE.length > 0,
    timestamp: new Date().toISOString()
  });
});

// Convertir UniverseId a PlaceId
app.get('/api/universe/:universeId', async (req, res) => {
  const universeId = parseInt(req.params.universeId);
  
  if (isNaN(universeId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid universeId'
    });
  }
  
  try {
    const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return res.json({
        success: true,
        data: {
          universeId: universeId,
          rootPlaceId: data.data[0].rootPlaceId,
          name: data.data[0].name,
          creator: data.data[0].creator
        }
      });
    } else {
      return res.json({
        success: false,
        error: 'Universe not found'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener presencia CON autenticación Y JOBID
app.get('/api/presence/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid userId'
    });
  }
  
  try {
    console.log('🔍 Buscando userId:', userId);
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Roblox/WinInet'
    };
    
    // Agregar cookie si existe (REQUERIDO para gameId)
    if (ROBLOX_COOKIE) {
      headers['Cookie'] = `.ROBLOSECURITY=${ROBLOX_COOKIE}`;
      console.log('✅ Usando autenticación');
    } else {
      console.log('⚠️  Sin autenticación - gameId (JobId) será null');
    }
    
    // Petición a la API de presencia
    const response = await fetch('https://presence.roblox.com/v1/presence/users', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        userIds: [userId]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Respuesta completa:', JSON.stringify(data));
    
    if (!data.userPresences || data.userPresences.length === 0) {
      return res.json({
        success: false,
        error: 'User not found'
      });
    }
    
    const presence = data.userPresences[0];
    let placeId = presence.placeId || presence.rootPlaceId;
    
    // IMPORTANTE: gameId ES EL JOBID DEL SERVIDOR
    const jobId = presence.gameId || null;
    
    console.log('🎯 JobId encontrado:', jobId || 'null (privacidad activada)');
    
    // Si no hay placeId pero hay universeId, convertirlo
    if (!placeId && presence.universeId) {
      console.log('🔄 Convirtiendo universeId a placeId...');
      try {
        const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${presence.universeId}`);
        const gameData = await gameRes.json();
        
        if (gameData.data && gameData.data[0]) {
          placeId = gameData.data[0].rootPlaceId;
          console.log('✅ PlaceId obtenido:', placeId);
        }
      } catch (e) {
        console.log('❌ Error convirtiendo:', e.message);
      }
    }
    
    return res.json({
      success: true,
      data: {
        userId: presence.userId,
        userPresenceType: presence.userPresenceType,
        lastLocation: presence.lastLocation || 'Unknown',
        placeId: placeId,
        rootPlaceId: presence.rootPlaceId,
        jobId: jobId, // ⭐ NUEVO: JobId del servidor específico
        gameId: presence.gameId, // Igual que jobId
        universeId: presence.universeId,
        lastOnline: presence.lastOnline,
        hasJobId: jobId !== null // Indica si podemos unirte al servidor exacto
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔐 Autenticación: ${ROBLOX_COOKIE ? 'ACTIVADA ✅' : 'DESACTIVADA ⚠️'}`);
  if (!ROBLOX_COOKIE) {
    console.log('⚠️  Agrega ROBLOX_COOKIE para obtener JobId');
    console.log('📖 Guía: https://www.youtube.com/watch?v=W3qyqHZJx9I');
  }
  console.log('🎯 JobId support: ACTIVADO');
  console.log('========================================');
});
