import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const appTree = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

root.render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </React.StrictMode>
);
