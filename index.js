require('dotenv').config();
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

app.get('/', (req, res) => {
  res.send('Bienvenido a la API de Mercado Shops');
});

// Rutas de la API (se detallarán más adelante)
app.get('/auth/mercado-shops', (req, res) => {
  const redirect_uri = `${process.env.BASE_URL}/auth/callback`; // Reemplaza con tu URL de callback
  const auth_url = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_uri}`;
  res.redirect(auth_url);
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BASE_URL}/auth/callback`, // Reemplaza con tu URL de callback
      });
  
      const { access_token, refresh_token } = response.data;
  
      // Guardar access_token y refresh_token en la base de datos asociados al usuario.
      const user = await prisma.usuario.findUnique({
        where: {
          email: req.user.email,
        },
      });

      if (user) {
        await prisma.usuario.update({
          where: {
            id: user.id,
          },
          data: {
            accessToken: access_token,
            refreshToken: refresh_token,
          },
        });
      } else {
        await prisma.usuario.create({
          data: {
            email: req.user.email,
            accessToken: access_token,
            refreshToken: refresh_token,
          },
        });
      }
  
      res.redirect('/'); // Redirigir al usuario a la página principal
    } catch (error) {
      console.error("Error en la autorización:", error);
      res.status(500).send('Error en la autorización');
    }
  });

  app.get('/api/products', async (req, res) => {
    // Obtener el access_token del usuario desde la base de datos
    const user = await prisma.usuario.findUnique({
      where: {
        email: req.user.email,
      },
    });

    if (!user || !user.accessToken) {
      return res.status(401).send('Usuario no autorizado');
    }

    const accessToken = user.accessToken;
    
  
    try {
      const response = await axios.get(`https://api.mercadoshops.com/v1/sites/${siteId}/items/search`, { //TODO: Cambiar por el site_id del usuario
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          // Parámetros de búsqueda, como offset, limit, etc.
          limit: 10,
          offset: 0,
          sort: 'price_asc',
        },
      });
  
      res.json(response.data);
  
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).send('Error al obtener productos');
    }
  });
  
  

app.listen(port, () => {
  console.log(`Servidor backend escuchando en el puerto ${port}`);
});