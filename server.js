// server.js - Servidor Proxy para Roblox Presence API
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para Roblox
app.use(cors());
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Roblox Presence Proxy API',
    endpoints: {
      presence: '/api/presence/:userId',
      test: '/api/test'
    }
  });
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'El servidor está funcionando correctamente!',
    timestamp: new Date().toISOString()
  });
});

// Endpoint principal: Obtener presencia de un usuario
app.get('/api/presence/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid userId'
    });
  }
  
  try {
    console.log('Solicitando presencia para userId:', userId);
    
    // Hacer petición a la API de Roblox
    const response = await fetch('https://presence.roblox.com/v1/presence/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: [userId]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Roblox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Respuesta recibida:', data);
    
    if (data.userPresences && data.userPresences.length > 0) {
      const presence = data.userPresences[0];
      
      return res.json({
        success: true,
        data: {
          userId: presence.userId,
          userPresenceType: presence.userPresenceType,
          lastLocation: presence.lastLocation || 'Unknown',
          placeId: presence.placeId || null,
          rootPlaceId: presence.rootPlaceId || null,
          gameId: presence.gameId || null,
          universeId: presence.universeId || null,
          lastOnline: presence.lastOnline || null
        }
      });
    } else {
      return res.json({
        success: false,
        error: 'User not found or no presence data available'
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

// Endpoint alternativo con POST
app.post('/api/presence', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing userId in request body'
    });
  }
  
  // Redirigir a GET endpoint
  const userIdInt = parseInt(userId);
  try {
    const response = await fetch('https://presence.roblox.com/v1/presence/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: [userIdInt]
      })
    });
    
    const data = await response.json();
    
    if (data.userPresences && data.userPresences.length > 0) {
      return res.json({
        success: true,
        data: data.userPresences[0]
      });
    } else {
      return res.json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor proxy corriendo en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   - GET  /`);
  console.log(`   - GET  /api/test`);
  console.log(`   - GET  /api/presence/:userId`);
  console.log(`   - POST /api/presence`);
});
