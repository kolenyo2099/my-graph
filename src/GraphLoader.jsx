import React, { useState, useRef, useEffect } from 'react';
import { Cosmograph, CosmographSearch } from '@cosmograph/react';
import Papa from 'papaparse';

const TweetPopup = ({ tweet, onClose }) => (
    <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#2A303C',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        width: '90%',
        zIndex: 1000,
        color: '#E2E8F0'
    }}>
        <button 
            onClick={onClose}
            style={{
                position: 'absolute',
                right: '10px',
                top: '10px',
                border: 'none',
                background: 'none',
                color: '#E2E8F0',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '5px'
            }}
        >
            ×
        </button>
        <h3 style={{ marginTop: 0, color: '#88CCF1' }}>@{tweet.author}</h3>
        <p style={{ 
            whiteSpace: 'pre-wrap', 
            marginBottom: '20px',
            lineHeight: '1.5'
        }}>
            {tweet.body}
        </p>
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            textAlign: 'center',
            borderTop: '1px solid #404756',
            paddingTop: '15px'
        }}>
            <div>
                <div style={{ fontWeight: 'bold' }}>{tweet.metrics.retweets}</div>
                <div style={{ color: '#94A3B8' }}>Retweets</div>
            </div>
            <div>
                <div style={{ fontWeight: 'bold' }}>{tweet.metrics.likes}</div>
                <div style={{ color: '#94A3B8' }}>Likes</div>
            </div>
            <div>
                <div style={{ fontWeight: 'bold' }}>{tweet.metrics.replies}</div>
                <div style={{ color: '#94A3B8' }}>Replies</div>
            </div>
            <div>
                <div style={{ fontWeight: 'bold' }}>{tweet.metrics.quotes}</div>
                <div style={{ color: '#94A3B8' }}>Quotes</div>
            </div>
        </div>
    </div>
);

const ColorLegend = () => {
    const legendItems = [
        { color: '#94A3B8', label: 'No engagement' },
        { color: '#88CCF1', label: '1-9 interactions' },
        { color: '#B5E8B0', label: '10-49 interactions' },
        { color: '#FFB86C', label: '50-199 interactions' },
        { color: '#FF79C6', label: '200+ interactions' },
    ];

    return (
        <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            background: '#2A303C',
            padding: '15px',
            borderRadius: '10px',
            color: '#E2E8F0',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#88CCF1' }}>Tweet Engagement</h3>
            {legendItems.map(({ color, label }) => (
                <div key={color} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        marginRight: '10px'
                    }} />
                    <span>{label}</span>
                </div>
            ))}
            <div style={{ fontSize: '0.9em', marginTop: '10px', color: '#94A3B8' }}>
                Node size increases with engagement
            </div>
        </div>
    );
};

function GraphLoader() {
    const [nodes, setNodes] = useState([]);
    const [displayedNodes, setDisplayedNodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTweet, setSelectedTweet] = useState(null);
    const [authorStats, setAuthorStats] = useState({ uniqueAuthors: 0 });
    const [stats, setStats] = useState({
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        reasons: {
            noBody: 0,
            noCoordinates: 0,
            invalidX: 0,
            invalidY: 0
        }
    });

    const cosmographRef = useRef(null);

    const getNodeColor = (node) => {
        const totalEngagement = 
            node.metrics.likes + 
            node.metrics.retweets + 
            node.metrics.replies + 
            node.metrics.quotes;
        
        if (totalEngagement === 0) return '#94A3B8';
        if (totalEngagement < 10) return '#88CCF1';
        if (totalEngagement < 50) return '#B5E8B0';
        if (totalEngagement < 200) return '#FFB86C';
        return '#FF79C6';
    };

    const getNodeSize = (node) => {
        const totalEngagement = 
            node.metrics.likes + 
            node.metrics.retweets + 
            node.metrics.replies + 
            node.metrics.quotes;
        
        const minSize = 0.002;
        const maxSize = 1;
        const logMax = Math.log(node.maxEngagement + 1);
        
        if (totalEngagement === 0) return minSize;
        
        const size = minSize + ((Math.log(totalEngagement + 1) / logMax) * (maxSize - minSize));
        return size;
    };

    useEffect(() => {
        const loadData = async () => {
    try {
        // Use a proper path that works in both development and production
        const csvPath = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/toembed.csv` : '/toembed.csv';
        const response = await fetch(csvPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
                
                Papa.parse(text, {
                    header: true,
                    delimiter: ";",
                    skipEmptyLines: true,
                    complete: function(results) {
                        let localStats = {
                            totalRows: results.data.length,
                            validRows: 0,
                            invalidRows: 0,
                            reasons: {
                                noBody: 0,
                                noCoordinates: 0,
                                invalidX: 0,
                                invalidY: 0
                            }
                        };

                        let maxEngagement = 0;
                        results.data.forEach(row => {
                            const engagement = (
                                parseInt(row.retweet_count) || 0) + 
                                (parseInt(row.reply_count) || 0) + 
                                (parseInt(row.like_count) || 0) + 
                                (parseInt(row.quote_count) || 0
                            );
                            maxEngagement = Math.max(maxEngagement, engagement);
                        });

                        const processedNodes = results.data
                            .filter(row => {
                                const isValid = row.body && 
                                              row.embedding_x && 
                                              row.embedding_y &&
                                              !isNaN(parseFloat(row.embedding_x)) && 
                                              !isNaN(parseFloat(row.embedding_y));
                                
                                if (!isValid) {
                                    if (!row.body) localStats.reasons.noBody++;
                                    if (!row.embedding_x || !row.embedding_y) localStats.reasons.noCoordinates++;
                                    if (isNaN(parseFloat(row.embedding_x))) localStats.reasons.invalidX++;
                                    if (isNaN(parseFloat(row.embedding_y))) localStats.reasons.invalidY++;
                                    localStats.invalidRows++;
                                } else {
                                    localStats.validRows++;
                                }
                                
                                return isValid;
                            })
                            .map((row, index) => ({
                                id: `tweet-${index}`,
                                x: parseFloat(row.embedding_x),
                                y: parseFloat(row.embedding_y),
                                body: row.body,
                                author: row.author,
                                metrics: {
                                    retweets: parseInt(row.retweet_count) || 0,
                                    replies: parseInt(row.reply_count) || 0,
                                    likes: parseInt(row.like_count) || 0,
                                    quotes: parseInt(row.quote_count) || 0
                                },
                                maxEngagement: maxEngagement
                            }));

                        const uniqueAuthors = new Set(processedNodes.map(node => node.author)).size;
                        setAuthorStats({ uniqueAuthors });
                        setStats(localStats);
                        setNodes(processedNodes);
                        setDisplayedNodes(processedNodes);
                        setIsLoading(false);
                    },
                    error: function(error) {
                        console.error('Error parsing CSV:', error);
                        setError(`Failed to parse CSV: ${error}`);
                        setIsLoading(false);
                    }
                });
            } catch (error) {
                console.error("Error loading data:", error);
                setError(`Failed to load data: ${error.message}`);
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const searchConfig = {
        accessors: [
            { 
                label: 'Author', 
                accessor: (node) => node.author 
            },
            { 
                label: 'Tweet', 
                accessor: (node) => node.body 
            }
        ],
        placeholder: 'Search authors or tweets...',
        maxVisibleItems: 8,
        truncateValues: 150,
        minMatch: 2,
        events: {
            onSearch: (matchingNodes) => {
                if (!matchingNodes) {
                    setDisplayedNodes(nodes);
                } else {
                    setDisplayedNodes(matchingNodes);
                    cosmographRef.current?.fitViewByNodeIds(
                        matchingNodes.map(node => node.id),
                        500
                    );
                }
            },
            onSelect: (node) => {
                if (node) {
                    setSelectedTweet(node);
                    cosmographRef.current?.zoomToNode(node);
                }
            }
        }
    };

    if (error) {
        return <div style={{ color: '#E2E8F0', padding: '20px' }}>Error: {error}</div>;
    }

    if (isLoading) {
        return <div style={{ color: '#E2E8F0', padding: '20px' }}>Loading data... {stats.totalRows} rows processed so far</div>;
    }

    return (
        <div style={{ 
            width: '100vw', 
            height: '100vh', 
            position: 'relative',
            backgroundColor: '#1A1E2E'
        }}>
            {/* Title */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#E2E8F0',
                textAlign: 'center',
                zIndex: 1000
            }}>
                <h1 style={{ 
                    margin: '0 0 5px 0',
                    fontSize: '24px',
                    fontWeight: 'bold'
                }}>
                    #OSINT on Twitter 2020-2023
                </h1>
                <div style={{ 
                    fontSize: '16px',
                    color: '#94A3B8'
                }}>
                    Embeddings of {stats.validRows.toLocaleString()} tweets from {authorStats.uniqueAuthors.toLocaleString()} unique authors
                </div>
            </div>

            {/* Search Component */}
            <div style={{
                position: 'absolute',
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
                zIndex: 1000,
                '--cosmograph-search-text-color': '#E2E8F0',
                '--cosmograph-search-list-background': '#2A303C',
                '--cosmograph-search-input-background': '#2A303C',
                '--cosmograph-search-mark-background': 'rgba(136, 204, 241, 0.3)',
                '--cosmograph-search-accessor-background': 'rgba(136, 204, 241, 0.2)',
                '--cosmograph-search-interactive-background': 'rgba(136, 204, 241, 0.4)',
                '--cosmograph-search-hover-color': 'rgba(136, 204, 241, 0.1)'
            }}>
                <CosmographSearch {...searchConfig} />
            </div>

            {/* Stats Panel */}
            <div style={{ 
                position: 'absolute', 
                top: 10, 
                right: 10,
                background: '#2A303C',
                padding: '15px', 
                borderRadius: '10px',
                zIndex: 1000,
                maxWidth: '300px',
                color: '#E2E8F0',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#88CCF1' }}>Dataset Statistics</h3>
                <div>Total Tweets: {stats.validRows.toLocaleString()}</div>
                <div>Unique Authors: {authorStats.uniqueAuthors.toLocaleString()}</div>
                {displayedNodes.length !== nodes.length && (
                    <div style={{ marginTop: '10px', color: '#88CCF1' }}>
                        Showing: {displayedNodes.length} matches
                    </div>
                )}
            </div>

            {/* Color Legend */}
            <ColorLegend />

            <Cosmograph
                ref={cosmographRef}
                nodes={displayedNodes}
                nodeSize={getNodeSize}
                nodeColor={getNodeColor}
                showDynamicLabels={false}
                disableSimulation={true}
                hoveredNodeRingColor="#E2E8F0"
                backgroundColor="#1A1E2E"
                nodeLabelAccessor={(node) => `@${node.author}`}
                onClick={(node) => {
                    if (node) {
                        setSelectedTweet(node);
                    }
                }}
            />
            
            {selectedTweet && (
                <TweetPopup 
                    tweet={selectedTweet} 
                    onClose={() => setSelectedTweet(null)}
                />
            )}
        </div>
    );
}

export default GraphLoader;
