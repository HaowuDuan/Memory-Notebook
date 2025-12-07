import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  isConnected: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputAnalyser, outputAnalyser, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Handle resizing
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!isConnected) {
        // Idle State: Gentle Pulse
        const time = Date.now() / 1000;
        const radius = 30 + Math.sin(time * 2) * 5;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'; // Indigo
        ctx.fill();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      // Active State: Visualization
      let combinedData = new Uint8Array(0);
      let activeColor = 'rgba(99, 102, 241, 0.8)'; // Default indigo

      // We prioritize showing the output (AI speaking) over input
      // Get frequency data
      let inputData = new Uint8Array(0);
      let outputData = new Uint8Array(0);

      if (inputAnalyser) {
          const bufferLength = inputAnalyser.frequencyBinCount;
          inputData = new Uint8Array(bufferLength);
          inputAnalyser.getByteFrequencyData(inputData);
      }
      
      if (outputAnalyser) {
          const bufferLength = outputAnalyser.frequencyBinCount;
          outputData = new Uint8Array(bufferLength);
          outputAnalyser.getByteFrequencyData(outputData);
      }

      // Calculate average volumes
      const getAvg = (arr: Uint8Array) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const inputVol = getAvg(inputData);
      const outputVol = getAvg(outputData);

      // Determine dominant source
      let dataToRender = inputData;
      // Heuristic: if output volume is significant, show AI colors.
      if (outputVol > 10) { 
          dataToRender = outputData;
          activeColor = 'rgba(236, 72, 153, 0.9)'; // Pink/Fuchsia for AI
      } else {
          activeColor = 'rgba(59, 130, 246, 0.9)'; // Blue for User
      }

      // Render Circular Waveform
      const radiusBase = 60;
      const bars = 60;
      const step = (Math.PI * 2) / bars;

      ctx.beginPath();
      for (let i = 0; i < bars; i++) {
        // Map bar index to frequency index roughly
        const dataIndex = Math.floor((i / bars) * (dataToRender.length / 2)); 
        const value = dataToRender[dataIndex] || 0;
        
        // Scale bar length
        const barHeight = (value / 255) * 100;
        const angle = i * step;
        
        const xStart = centerX + Math.cos(angle) * radiusBase;
        const yStart = centerY + Math.sin(angle) * radiusBase;
        
        const xEnd = centerX + Math.cos(angle) * (radiusBase + barHeight);
        const yEnd = centerY + Math.sin(angle) * (radiusBase + barHeight);
        
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
      }
      
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = activeColor;
      ctx.stroke();

      // Inner Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, radiusBase - 5, 0, 2 * Math.PI);
      ctx.fillStyle = activeColor.replace('0.9)', '0.1)');
      ctx.fill();

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [inputAnalyser, outputAnalyser, isConnected]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
    />
  );
};

export default Visualizer;