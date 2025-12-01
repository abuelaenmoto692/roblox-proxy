// Nuevo método usando thumbnails
app.get('/api/presence/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid userId'
    });
  }
  
  try {
    console.log('Buscando usuario:', userId);
    
    // Método 1: Obtener presencia básica
    const presenceRes = await fetch('https://presence.roproxy.com/v1/presence/users', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userIds: [userId]})
    });
    
    const presenceData = await presenceRes.json();
    const presence = presenceData.userPresences?.[0];
    
    if (!presence) {
      return res.json({success: false, error: 'User not found'});
    }
    
    // Si tiene gameId o universeId, intentar obtener el placeId
    let placeId = presence.placeId;
    
    if (!placeId && presence.universeId) {
      try {
        const gameRes = await fetch(`https://games.roproxy.com/v1/games?universeIds=${presence.universeId}`);
        const gameData = await gameRes.json();
        
        if (gameData.data && gameData.data[0]) {
          placeId = gameData.data[0].rootPlaceId;
          console.log('PlaceId obtenido:', placeId);
        }
      } catch (e) {
        console.log('Error obteniendo placeId:', e);
      }
    }
    
    return res.json({
      success: true,
      data: {
        userId: presence.userId,
        userPresenceType: presence.userPresenceType,
        lastLocation: presence.lastLocation || 'Unknown',
        placeId: placeId,
        universeId: presence.universeId,
        gameId: presence.gameId
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
