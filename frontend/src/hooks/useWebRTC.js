/**
 * useWebRTC — WebRTC peer-to-peer hook for Online PvP
 * Signaling via WebSocket relay on the backend
 * Game data (moves) exchanged via RTCDataChannel
 */
import { useRef, useState, useCallback, useEffect } from 'react';

const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

export function useWebRTC({ onRemoteMove, onConnectionChange, onOpponentReady }) {
  const [status, setStatus]     = useState('idle'); // idle|connecting|connected|opponent_ready|error
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole]         = useState(null);   // 'host' | 'guest'

  const pcRef  = useRef(null);
  const dcRef  = useRef(null);
  const wsRef  = useRef(null);

  const updateStatus = useCallback((s) => {
    setStatus(s);
    onConnectionChange?.(s);
  }, [onConnectionChange]);

  const setupDataChannel = useCallback((dc) => {
    dcRef.current = dc;
    dc.onopen    = () => updateStatus('connected');
    dc.onclose   = () => updateStatus('idle');
    dc.onerror   = () => updateStatus('error');
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'move')  onRemoteMove?.(msg.move, msg.articulationScore);
        if (msg.type === 'ready') onOpponentReady?.();
      } catch (_) {}
    };
  }, [onRemoteMove, onOpponentReady, updateStatus]);

  const connect = useCallback(async (code, playerRole) => {
    setRoomCode(code);
    setRole(playerRole);
    updateStatus('connecting');

    // --- WebSocket signaling ---
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const wsUrl = backendUrl.replace(/^http/, 'ws') + `/api/ws/room/${code}/${playerRole}`;
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;

    const pc = new RTCPeerConnection({ iceServers: STUN });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ice', candidate: e.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        updateStatus('error');
      }
    };

    // Host creates the data channel; guest receives it
    if (playerRole === 'host') {
      const dc = pc.createDataChannel('phonemon');
      setupDataChannel(dc);
    } else {
      pc.ondatachannel = (e) => setupDataChannel(e.channel);
    }

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      try {
        if (msg.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', answer }));
        } else if (msg.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        } else if (msg.type === 'ice') {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      } catch (err) { console.warn('Signaling error', err); }
    };

    ws.onopen = async () => {
      if (playerRole === 'host') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', offer }));
      }
    };

    ws.onerror = () => updateStatus('error');
  }, [setupDataChannel, updateStatus]);

  /** Send local move to opponent */
  const sendMove = useCallback((move, articulationScore) => {
    const dc = dcRef.current;
    if (dc?.readyState === 'open') {
      dc.send(JSON.stringify({ type: 'move', move, articulationScore }));
    }
  }, []);

  /** Signal calibration complete / ready to battle */
  const sendReady = useCallback(() => {
    const dc = dcRef.current;
    if (dc?.readyState === 'open') dc.send(JSON.stringify({ type: 'ready' }));
  }, []);

  const disconnect = useCallback(() => {
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    try { wsRef.current?.close(); } catch {}
    dcRef.current = null; pcRef.current = null; wsRef.current = null;
    updateStatus('idle');
  }, [updateStatus]);

  // Cleanup
  useEffect(() => () => disconnect(), []); // eslint-disable-line

  return { status, roomCode, role, connect, sendMove, sendReady, disconnect };
}
