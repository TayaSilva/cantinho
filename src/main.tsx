import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Notifications } from './components/ui/Notifications';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Notifications />
  </StrictMode>,
);
