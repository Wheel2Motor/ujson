/**
 * 连接管理模块
 * 负责连接的创建、删除和绘制
 */

export class ConnectionManager {
    constructor(editor) {
        this.editor = editor;
        this.isConnecting = false;
        this.connectionStart = null;
        this.tempConnection = null;
        
        // 拖拽断开连接相关
        this.isDraggingFromConnected = false;
        this.dragStartPosition = { x: 0, y: 0 };
        this.dragThreshold = 20;
        this.originalConnection = null;
        this.isDraggedOutOfSocket = false;
    }

    /**
     * 检查socket是否有连接
     * @param {number} nodeId - 节点ID
     * @param {string} socketName - socket名称
     * @param {boolean} isInput - 是否为输入socket
     * @returns {boolean}
     */
    socketHasConnection(nodeId, socketName, isInput) {
        for (const connection of this.editor.connections.values()) {
            if (isInput) {
                if (connection.to.nodeId === nodeId && connection.to.socket === socketName) {
                    return true;
                }
            } else {
                if (connection.from.nodeId === nodeId && connection.from.socket === socketName) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 检查socket是否已连接
     * @param {number} nodeId - 节点ID
     * @param {string} socketName - socket名称
     * @param {string} socketType - socket类型 ('input' | 'output')
     * @returns {boolean}
     */
    isSocketConnected(nodeId, socketName, socketType) {
        for (const connection of this.editor.connections.values()) {
            if (socketType === 'input') {
                if (connection.to.nodeId === nodeId && connection.to.socket === socketName) {
                    return true;
                }
            } else if (socketType === 'output') {
                if (connection.from.nodeId === nodeId && connection.from.socket === socketName) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 断开socket的连接
     * @param {Object} target - 目标信息
     */
    disconnectSocket(target) {
        const nodeId = target.nodeId;
        const socketName = target.socketName;
        const isInput = target.isInput;
        
        const connectionsToRemove = [];
        
        this.editor.connections.forEach((connection, id) => {
            if (isInput) {
                if (connection.to.nodeId === nodeId && connection.to.socket === socketName) {
                    connectionsToRemove.push(id);
                }
            } else {
                if (connection.from.nodeId === nodeId && connection.from.socket === socketName) {
                    connectionsToRemove.push(id);
                }
            }
        });
        
        connectionsToRemove.forEach(id => {
            this.removeConnection(id);
        });
        
        this.editor.jsonHandler.updateJsonPreview();
    }

    /**
     * 开始创建连接
     * @param {MouseEvent} e - 鼠标事件
     * @param {HTMLElement} socket - socket元素
     */
    startConnection(e, socket) {
        e.preventDefault();
        e.stopPropagation();
        
        const nodeId = socket.dataset.nodeId;
        const socketName = socket.dataset.socket;
        const isInput = socket.classList.contains('input-socket');
        const hasExistingConnection = this.socketHasConnection(nodeId, socketName, isInput);
        
        this.isConnecting = true;
        this.connectionStart = {
            nodeId: nodeId,
            socket: socketName,
            isOutput: socket.classList.contains('output-socket'),
            element: socket,
            hasExistingConnection: hasExistingConnection
        };
        
        if (hasExistingConnection && isInput) {
            this.isDraggingFromConnected = true;
            this.dragStartPosition = { x: e.clientX, y: e.clientY };
            this.isDraggedOutOfSocket = false;
            
            for (const [connectionId, connection] of this.editor.connections.entries()) {
                if (connection.to.nodeId === nodeId && connection.to.socket === socketName) {
                    this.originalConnection = {
                        id: connectionId,
                        connection: { ...connection }
                    };
                    break;
                }
            }
        } else {
            this.isDraggingFromConnected = false;
            this.originalConnection = null;
            this.isDraggedOutOfSocket = false;
        }
    }

    /**
     * 处理连接拖拽移动
     * @param {number} canvasX - 画布X坐标
     * @param {number} canvasY - 画布Y坐标
     * @param {MouseEvent} e - 鼠标事件
     */
    handleConnectionMove(canvasX, canvasY, e) {
        if (!this.isConnecting || !this.connectionStart) return;

        if (this.isDraggingFromConnected && this.originalConnection) {
            const dragDistance = Math.sqrt(
                Math.pow(e.clientX - this.dragStartPosition.x, 2) + 
                Math.pow(e.clientY - this.dragStartPosition.y, 2)
            );
            
            if (dragDistance > this.dragThreshold) {
                this.isDraggedOutOfSocket = true;
                
                if (this.originalConnection) {
                    const originalPath = document.querySelector(`[data-connection-id="${this.originalConnection.id}"]`);
                    if (originalPath) {
                        originalPath.style.display = 'none';
                    }
                }
                
                this.drawTempConnectionFromOriginal(canvasX, canvasY);
            } else {
                this.removeTempConnection();
                this.isDraggedOutOfSocket = false;
                
                if (this.originalConnection) {
                    const originalPath = document.querySelector(`[data-connection-id="${this.originalConnection.id}"]`);
                    if (originalPath) {
                        originalPath.style.display = '';
                    }
                }
            }
        } else {
            this.drawTempConnection(canvasX, canvasY);
        }
    }

    /**
     * 处理连接拖拽结束
     * @param {MouseEvent} e - 鼠标事件
     */
    handleConnectionEnd(e) {
        if (!this.isConnecting) return;

        const target = e.target;
        
        if (this.isDraggingFromConnected && this.originalConnection) {
            const dragDistance = Math.sqrt(
                Math.pow(e.clientX - this.dragStartPosition.x, 2) + 
                Math.pow(e.clientY - this.dragStartPosition.y, 2)
            );
            
            if (dragDistance <= this.dragThreshold) {
                this.restoreOriginalConnection();
            } else {
                const socketUnderMouse = this.getSocketUnderMouse(e.clientX, e.clientY);
                
                if (socketUnderMouse && socketUnderMouse !== this.connectionStart.element) {
                    this.removeConnection(this.originalConnection.id);
                    this.createConnectionFromOriginal(socketUnderMouse);
                } else {
                    if (socketUnderMouse === this.connectionStart.element) {
                        this.restoreOriginalConnection();
                    } else {
                        this.removeConnection(this.originalConnection.id);
                    }
                }
            }
        } else {
            if (target.classList.contains('socket') && target !== this.connectionStart.element) {
                this.createConnection(target);
            }
        }
        
        this.resetConnectionState();
    }

    /**
     * 重置连接状态
     */
    resetConnectionState() {
        this.isConnecting = false;
        this.connectionStart = null;
        this.isDraggingFromConnected = false;
        this.originalConnection = null;
        this.isDraggedOutOfSocket = false;
        this.removeTempConnection();
    }

    /**
     * 获取鼠标位置下的socket
     * @param {number} clientX - 客户端X坐标
     * @param {number} clientY - 客户端Y坐标
     * @returns {HTMLElement|null}
     */
    getSocketUnderMouse(clientX, clientY) {
        const tempConnection = document.querySelector('.temp-connection');
        if (tempConnection) {
            tempConnection.style.pointerEvents = 'none';
        }
        
        const elementsUnderMouse = document.elementsFromPoint(clientX, clientY);
        
        if (tempConnection) {
            tempConnection.style.pointerEvents = '';
        }
        
        for (const element of elementsUnderMouse) {
            if (element.classList.contains('socket')) {
                return element;
            }
        }
        
        return null;
    }

    /**
     * 恢复原始连接
     */
    restoreOriginalConnection() {
        if (this.originalConnection) {
            if (!this.editor.connections.has(this.originalConnection.id)) {
                this.editor.connections.set(this.originalConnection.id, this.originalConnection.connection);
            }
            
            const originalPath = document.querySelector(`[data-connection-id="${this.originalConnection.id}"]`);
            if (originalPath) {
                originalPath.style.display = '';
            } else {
                this.drawConnection(this.originalConnection.connection);
            }
        }
    }

    /**
     * 从原始连接创建新连接
     * @param {HTMLElement} targetSocket - 目标socket元素
     */
    createConnectionFromOriginal(targetSocket) {
        if (!this.originalConnection) {
            return;
        }
        
        const targetNodeId = targetSocket.dataset.nodeId;
        const targetSocketName = targetSocket.dataset.socket;
        const isTargetOutput = targetSocket.classList.contains('output-socket');

        if (isTargetOutput) {
            return;
        }

        if (targetNodeId === this.connectionStart.nodeId && targetSocketName === this.connectionStart.socket) {
            return;
        }

        const outputNodeId = this.originalConnection.connection.from.nodeId;
        const outputSocket = this.originalConnection.connection.from.socket;

        const existingConnections = Array.from(this.editor.connections.entries()).filter(([id, conn]) => 
            conn.to.nodeId === targetNodeId && conn.to.socket === targetSocketName
        );

        existingConnections.forEach(([connectionId, connection]) => {
            this.removeConnection(connectionId);
        });

        const connectionId = this.editor.connectionIdCounter++;
        const connection = {
            id: connectionId,
            from: {
                nodeId: outputNodeId,
                socket: outputSocket
            },
            to: {
                nodeId: targetNodeId,
                socket: targetSocketName
            }
        };

        this.editor.connections.set(connectionId, connection);
        this.drawConnection(connection);
        
        const targetNode = this.editor.nodes.get(targetNodeId);
        if (targetNode && targetNode.type === 'object') {
            this.editor.nodeManager.checkObjectDuplicateKeys(targetNode);
        }
        
        this.editor.jsonHandler.updateJsonPreview();
        this.editor.sceneManager.markSceneDirty();
    }

    /**
     * 创建新连接
     * @param {HTMLElement} targetSocket - 目标socket元素
     */
    createConnection(targetSocket) {
        const targetNodeId = targetSocket.dataset.nodeId;
        const targetSocketName = targetSocket.dataset.socket;
        const isTargetOutput = targetSocket.classList.contains('output-socket');

        if (this.connectionStart.isOutput === isTargetOutput) {
            return;
        }

        if (this.connectionStart.nodeId === targetNodeId) {
            return;
        }

        let inputNodeId, inputSocket, outputNodeId, outputSocket;
        
        if (this.connectionStart.isOutput) {
            outputNodeId = this.connectionStart.nodeId;
            outputSocket = this.connectionStart.socket;
            inputNodeId = targetNodeId;
            inputSocket = targetSocketName;
        } else {
            inputNodeId = this.connectionStart.nodeId;
            inputSocket = this.connectionStart.socket;
            outputNodeId = targetNodeId;
            outputSocket = targetSocketName;
        }

        const existingConnections = Array.from(this.editor.connections.entries()).filter(([id, conn]) => 
            conn.to.nodeId === inputNodeId && conn.to.socket === inputSocket
        );

        existingConnections.forEach(([connectionId, connection]) => {
            this.removeConnection(connectionId);
        });

        const connectionId = this.editor.connectionIdCounter++;
        const connection = {
            id: connectionId,
            from: {
                nodeId: outputNodeId,
                socket: outputSocket
            },
            to: {
                nodeId: inputNodeId,
                socket: inputSocket
            }
        };

        this.editor.connections.set(connectionId, connection);
        this.drawConnection(connection);
        
        const targetNode = this.editor.nodes.get(inputNodeId);
        if (targetNode && targetNode.type === 'object') {
            this.editor.nodeManager.checkObjectDuplicateKeys(targetNode);
            this.editor.nodeManager.updateObjectInputStyles(targetNode);
        }
        
        this.editor.jsonHandler.updateJsonPreview();
        this.editor.sceneManager.markSceneDirty();
    }

    /**
     * 删除连接
     * @param {number} connectionId - 连接ID
     */
    removeConnection(connectionId) {
        const connection = this.editor.connections.get(connectionId);
        
        this.editor.connections.delete(connectionId);
        
        const connectionPath = document.querySelector(`[data-connection-id="${connectionId}"]`);
        if (connectionPath) {
            connectionPath.remove();
        }
        
        if (connection) {
            const targetNode = this.editor.nodes.get(connection.to.nodeId);
            if (targetNode && targetNode.type === 'object') {
                this.editor.nodeManager.checkObjectDuplicateKeys(targetNode);
                this.editor.nodeManager.updateObjectInputStyles(targetNode);
            }
        }
        
        this.editor.jsonHandler.updateJsonPreview();
        this.editor.sceneManager.markSceneDirty();
    }

    /**
     * 绘制连接
     * @param {Object} connection - 连接对象
     */
    drawConnection(connection) {
        const fromNode = this.editor.nodes.get(connection.from.nodeId);
        const toNode = this.editor.nodes.get(connection.to.nodeId);
        
        if (!fromNode || !toNode) return;

        const fromSocket = document.querySelector(`[data-node-id="${connection.from.nodeId}"][data-socket="${connection.from.socket}"]`);
        const toSocket = document.querySelector(`[data-node-id="${connection.to.nodeId}"][data-socket="${connection.to.socket}"]`);
        
        if (!fromSocket || !toSocket) return;

        const fromPos = this.getSocketWorldPosition(fromSocket, fromNode);
        const toPos = this.getSocketWorldPosition(toSocket, toNode);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = this.createCurvePath(fromPos.x, fromPos.y, toPos.x, toPos.y);
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#9a9a9a');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('data-connection-id', connection.id);
        path.classList.add('connection');
        path.style.cursor = 'pointer';
        path.style.pointerEvents = 'auto';

        path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这个连接吗？')) {
                this.removeConnection(connection.id);
                this.editor.jsonHandler.updateJsonPreview();
            }
        });

        path.addEventListener('mouseenter', () => {
            path.setAttribute('stroke', '#a08b7a');
            path.setAttribute('stroke-width', '4');
        });

        path.addEventListener('mouseleave', () => {
            path.setAttribute('stroke', '#9a9a9a');
            path.setAttribute('stroke-width', '3');
        });

        this.editor.connectionsLayer.appendChild(path);
    }

    /**
     * 获取socket在世界空间中的位置
     * @param {HTMLElement} socket - socket元素
     * @param {Object} node - 节点对象
     * @returns {Object} - {x, y}
     */
    getSocketWorldPosition(socket, node) {
        const nodeEl = socket.closest('.node');
        if (!nodeEl) return { x: node.x, y: node.y };

        const socketRect = socket.getBoundingClientRect();
        const nodeRect = nodeEl.getBoundingClientRect();
        
        const scale = this.editor.canvasHandler.scale;
        const offsetX = (socketRect.left - nodeRect.left + socketRect.width / 2) / scale;
        const offsetY = (socketRect.top - nodeRect.top + socketRect.height / 2) / scale;
        
        return {
            x: node.x + offsetX,
            y: node.y + offsetY
        };
    }

    /**
     * 创建贝塞尔曲线路径
     * @param {number} x1 - 起始X
     * @param {number} y1 - 起始Y
     * @param {number} x2 - 结束X
     * @param {number} y2 - 结束Y
     * @returns {string}
     */
    createCurvePath(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const cp1x = x1 + Math.abs(dx) * 0.5;
        const cp1y = y1;
        const cp2x = x2 - Math.abs(dx) * 0.5;
        const cp2y = y2;
        
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }

    /**
     * 绘制临时连接线
     * @param {number} canvasX - 画布X坐标
     * @param {number} canvasY - 画布Y坐标
     */
    drawTempConnection(canvasX, canvasY) {
        this.removeTempConnection();
        
        if (!this.connectionStart) return;

        const startSocket = this.connectionStart.element;
        const startNode = this.editor.nodes.get(this.connectionStart.nodeId);
        
        if (!startNode) return;

        const startPos = this.getSocketWorldPosition(startSocket, startNode);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = this.createCurvePath(startPos.x, startPos.y, canvasX, canvasY);
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#9a9a9a');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.7');
        path.classList.add('temp-connection');

        this.editor.connectionsLayer.appendChild(path);
        this.tempConnection = path;
    }

    /**
     * 从原始连接绘制临时连接线
     * @param {number} canvasX - 画布X坐标
     * @param {number} canvasY - 画布Y坐标
     */
    drawTempConnectionFromOriginal(canvasX, canvasY) {
        this.removeTempConnection();
        
        if (!this.originalConnection) return;

        const outputNodeId = this.originalConnection.connection.from.nodeId;
        const outputSocketName = this.originalConnection.connection.from.socket;
        const outputNode = this.editor.nodes.get(outputNodeId);
        const outputSocket = document.querySelector(`[data-node-id="${outputNodeId}"][data-socket="${outputSocketName}"]`);
        
        if (!outputNode || !outputSocket) return;

        const startPos = this.getSocketWorldPosition(outputSocket, outputNode);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = this.createCurvePath(startPos.x, startPos.y, canvasX, canvasY);
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#9a9a9a');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.7');
        path.classList.add('temp-connection');

        this.editor.connectionsLayer.appendChild(path);
        this.tempConnection = path;
    }

    /**
     * 移除临时连接线
     */
    removeTempConnection() {
        if (this.tempConnection) {
            this.tempConnection.remove();
            this.tempConnection = null;
        }
    }

    /**
     * 更新所有连接线
     */
    updateConnections() {
        const connectionPaths = this.editor.connectionsLayer.querySelectorAll('.connection');
        connectionPaths.forEach(path => path.remove());

        this.editor.connections.forEach(connection => {
            this.drawConnection(connection);
        });
    }
}
