import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './redesign.css';
import './interaction.css';
import './creative.css';

const root = document.getElementById('root');
if (!root) throw new Error('页面容器未找到');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
import './workshop.css';
