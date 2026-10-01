import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, Animated } from 'react-native';
import * as KeepAwake from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';

let seed = Date.now();
function random() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function getRandomInterval() {
  const minSeconds = 60;
  const maxSeconds = 180;
  return Math.floor(random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [nextIn, setNextIn] = useState(null);
  const [patternCount, setPatternCount] = useState(0);
  
  const moveX = useRef(new Animated.Value(0)).current;
  const moveY = useRef(new Animated.Value(0)).current;
  
  let timeoutRef = useRef(null);

  const patterns = ['dots', 'lines-h', 'lines-v', 'diagonal', 'crosshatch'];

  function animatePattern(patternType) {
    let offset = 0;
    
    const step = () => {
      if (!isRunning) return;
      
      Animated.parallel([
        Animated.timing(moveX, {
          toValue: offset % 40,
          duration: 16,
          useNativeDriver: false
        }),
        Animated.timing(moveY, {
          toValue: (offset * 2) % 40,
          duration: 16,
          useNativeDriver: false
        })
      ]).start();
      
      offset += 2;
      timeoutRef.current = setTimeout(step, 16);
    };
    
    step();
  }

  function scheduleNextMovement() {
    const intervalSeconds = getRandomInterval();
    
    setNextIn(intervalSeconds);
    setStatus('Waiting...');
    
    // Dim screen while waiting to save battery
    Brightness.setSystemBrightnessAsync(0.1).catch(() => {});
    
    let countdown = intervalSeconds;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
      } else {
        setNextIn(countdown);
      }
    }, 1000);
    
    timeoutRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      if (isRunning) triggerMovement();
    }, intervalSeconds * 1000);
  }

  function triggerMovement() {
    const patternType = patterns[Math.floor(random() * patterns.length)];
    const durationMs = 1000 + Math.floor(random() * 2000);
    
    setStatus(`Moving (${patternType})`);
    setPatternCount(prev => prev + 1);
    
    // Brighten screen during movement so optical sensor can see patterns clearly
    Brightness.setSystemBrightnessAsync(1.0).catch(() => {});
    
    animatePattern(patternType);
    
    setTimeout(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      setStatus('Waiting...');
      scheduleNextMovement();
    }, durationMs);
  }

  function startJiggling() {
    setIsRunning(true);
    seed = Date.now();
    
    KeepAwake.activate();
    
    triggerMovement();
  }

  function stopJiggling() {
    setIsRunning(false);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    KeepAwake.deactivate();
    
    setStatus('Stopped');
    setNextIn(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🖱️ Mouse Jiggler</Text>
      
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{status}</Text>
        {nextIn !== null && (
          <Text style={styles.countdown}>
            Next: {Math.floor(nextIn/60)}m {nextIn%60}s
          </Text>
        )}
        <Text style={styles.patternCount}>Patterns: {patternCount}</Text>
      </View>

      <Animated.View 
        style={[
          styles.patternArea, 
          { transform: [{ translateX: moveX }, { translateY: moveY }] }
        ]}
      >
        <PatternGrid />
      </Animated.View>

      <View style={styles.controls}>
        {!isRunning ? (
          <Button title="Start" onPress={startJiggling} color="#4CAF50" />
        ) : (
          <Button title="Stop" onPress={stopJiggling} color="#f44336" />
        )}
      </View>

      <Text style={styles.instructions}>
        Place your optical mouse on the pattern area. Random movement every 1-3 minutes keeps your PC active.
      </Text>
    </View>
  );
}

function PatternGrid() {
  const dots = [];
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      dots.push(
        <View 
          key={`${x}-${y}`} 
          style={[styles.dot, { left: x * 40, top: y * 40 }]} 
        />
      );
    }
  }
  
  return (
    <View style={styles.gridContainer}>
      {dots}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  countdown: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  patternCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  patternArea: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gridContainer: {
    width: 800,
    height: 800,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
  },
  controls: {
    marginBottom: 20,
  },
  instructions: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
