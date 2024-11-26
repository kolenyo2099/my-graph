import React from 'react';
import { CosmographProvider } from '@cosmograph/react';
import GraphLoader from './GraphLoader';

function App() {
    return (
        <CosmographProvider>
            <div style={{ width: '100vw', height: '100vh' }}>
                <GraphLoader />
            </div>
        </CosmographProvider>
    );
}

export default App;