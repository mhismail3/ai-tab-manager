import React from 'react';
import { createRoot } from 'react-dom/client';
import TabGroupView from './TabGroupView';
import '../dashboard/styles.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<TabGroupView />); 