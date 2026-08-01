// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {ErrorBoundary} from './ErrorBoundary.jsx'

import { getStoredTheme, applyTheme } from "./theme";

applyTheme(getStoredTheme());

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  //   <App />
  // </StrictMode>,
  
  <ErrorBoundary>
  <App />
</ErrorBoundary>
)
  