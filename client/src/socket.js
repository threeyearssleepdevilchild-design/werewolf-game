import { io } from 'socket.io-client';

// 開発環境: 環境変数または現在のホストを使用
// 本番環境: 環境変数を使用
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 
  `http://${window.location.hostname}:3001`;

console.log('Socket接続先:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export default socket;
