import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ZenithErrorBoundary from './components/ZenithErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <ZenithErrorBoundary>
    <App />
  </ZenithErrorBoundary>
);
