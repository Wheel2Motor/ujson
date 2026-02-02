/**
 * 节点管理模块
 * 负责节点的创建、删除、更新和属性管理
 */

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class NodeManager {
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * 生成节点ID
     * @returns {string} 节点ID
     */
    generateNodeId() {
        return generateUUID();
    }

    /**
     * 添加新节点
     */
    addNode(type) {
        const nodeId = this.generateNodeId();
        const position = this.getNewNodePosition();
        
        const node = {
            id: nodeId,
            type: type,
            x: position.x,
            y: position.y,
            data: this.getDefaultNodeData(type),
            inputs: this.getNodeInputs(type),
            outputs: this.getNodeOutputs(type)
        };

        this.editor.nodes.set(nodeId, node);
        this.createNodeElement(node);
        this.editor.selectionManager.selectNode(node);
        this.editor.sceneManager.markSceneDirty();
    }

    /**
     * 获取默认节点数据
     */
    getDefaultNodeData(type) {
        switch (type) {
            case 'string': return { value: 'UJson' };
            case 'number': return { value: 0 };
            case 'boolean': return { value: true };
            case 'object': return { 
                properties: {}, 
                keys: {
                    'input0': 'key0',
                    'input1': 'key1', 
                    'input2': 'key2',
                    'input3': 'key3',
                    'input4': 'key4'
                }
            };
            case 'array': return { items: [] };
            case 'null': return { value: null };
            case 'output': return { outputPath: '' };
            default: return {};
        }
    }

    /**
     * 获取节点输入socket列表
     */
    getNodeInputs(type) {
        switch (type) {
            case 'object': return ['input0', 'input1', 'input2', 'input3', 'input4'];
            case 'array': return ['item0', 'item1', 'item2', 'item3', 'item4'];
            case 'output': return ['输入'];
            default: return [];
        }
    }

    /**
     * 获取节点输出socket列表
     */
    getNodeOutputs(type) {
        switch (type) {
            case 'output': return [];
            default: return ['输出'];
        }
    }

    /**
     * 获取新节点的位置
     */
    getNewNodePosition() {
        const rect = this.editor.canvas.getBoundingClientRect();
        const canvasHandler = this.editor.canvasHandler;
        
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        
        const worldCenterX = (viewportCenterX - canvasHandler.panX) / canvasHandler.scale;
        const worldCenterY = (viewportCenterY - canvasHandler.panY) / canvasHandler.scale;
        
        return { x: worldCenterX, y: worldCenterY };
    }

    /**
     * 创建节点DOM元素
     */
    createNodeElement(node) {
        const nodeEl = document.createElement('div');
        nodeEl.className = `node node-${node.type}`;
        nodeEl.style.left = node.x + 'px';
        nodeEl.style.top = node.y + 'px';
        nodeEl.dataset.nodeId = node.id;

        const typeNames = {
            'object': '对象',
            'array': '数组',
            'string': '字符串',
            'number': '数字',
            'boolean': '布尔值',
            'null': '空',
            'output': '输出'
        };

        // 构建HTML
        nodeEl.innerHTML = this.buildNodeHtml(node, typeNames);

        // 绑定节点拖拽事件 - 在节点任意空白处都可以拖动
        nodeEl.addEventListener('mousedown', (e) => {
            const target = e.target;
            // 排除交互元素：socket、输入框、按钮、选择框等
            if (target.classList.contains('socket') ||
                target.classList.contains('input-key') ||
                target.tagName.toLowerCase().match(/^(input|select|button|textarea)$/)) {
                return;
            }
            // 只响应左键
            if (e.button === 0) {
                this.editor.canvasHandler.startNodeDrag(e, node);
            }
        });

        // 绑定socket事件
        this.bindSocketEvents(nodeEl, node);

        // 绑定控件事件
        this.bindControlEvents(nodeEl, node);

        // 绑定节点选择事件
        nodeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const isInputElement = e.target.tagName.match(/^(INPUT|TEXTAREA|SELECT)$/i);
            const isShiftPressed = e.shiftKey;
            const isCtrlPressed = e.ctrlKey || e.metaKey;
            this.editor.selectionManager.selectNode(node, !isInputElement, isShiftPressed, isCtrlPressed);
            this.editor.contextMenuManager.hide();
        });

        // 绑定节点右键菜单事件
        nodeEl.addEventListener('contextmenu', (e) => {
            const target = e.target;
            // 如果是 socket，让 socket 的右键菜单处理
            if (target.classList.contains('socket')) {
                return;
            }
            // 如果是输入框等交互元素，不显示菜单
            if (target.classList.contains('input-key') ||
                target.tagName.toLowerCase().match(/^(input|select|button)$/)) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            // 显示删除节点菜单
            this.editor.contextMenuManager.show(e.clientX, e.clientY, { 
                nodeId: node.id, 
                isNode: true 
            });
        });

        // 检查重复键
        if (node.type === 'object') {
            this.checkObjectDuplicateKeys(node);
        }

        this.editor.nodesLayer.appendChild(nodeEl);
    }

    /**
     * 构建节点HTML
     */
    buildNodeHtml(node, typeNames) {
        let inputsHtml = this.buildInputsHtml(node);
        let controlsHtml = this.buildControlsHtml(node);
        let outputsHtml = this.buildOutputsHtml(node);

        return `
            <div class="node-header">
                <div class="title">${typeNames[node.type]}</div>
            </div>
            <div class="node-content">
                ${inputsHtml}
                ${controlsHtml}
                ${outputsHtml}
            </div>
        `;
    }

    /**
     * 构建输入socket HTML
     */
    buildInputsHtml(node) {
        let html = '';
        
        node.inputs.forEach((input) => {
            if (node.type === 'array') {
                html += `
                    <div class="input">
                        <div class="socket input-socket" data-socket="${input}" data-node-id="${node.id}"></div>
                    </div>
                `;
            } else if (node.type === 'object') {
                const keyName = node.data.keys ? node.data.keys[input] || input : input;
                const isConnected = this.editor.connectionManager.isSocketConnected(node.id, input, 'input');
                const disconnectedClass = isConnected ? '' : ' disconnected';
                html += `
                    <div class="input">
                        <div class="socket input-socket" data-socket="${input}" data-node-id="${node.id}"></div>
                        <input type="text" class="input-key${disconnectedClass}" value="${keyName}" data-socket="${input}">
                    </div>
                `;
            } else {
                html += `
                    <div class="input">
                        <div class="socket input-socket" data-socket="${input}" data-node-id="${node.id}"></div>
                        <span class="input-title">${input}</span>
                    </div>
                `;
            }
        });

        // 添加+按钮
        if (node.type === 'array') {
            html += `
                <div class="add-input-btn-container">
                    <button class="add-input-btn" data-action="add-array-input">+</button>
                    <span class="add-input-label">添加元素</span>
                </div>
            `;
        } else if (node.type === 'object') {
            html += `
                <div class="add-input-btn-container">
                    <button class="add-input-btn" data-action="add-object-input">+</button>
                    <span class="add-input-label">添加元素</span>
                </div>
            `;
        }

        return html;
    }

    /**
     * 构建控件HTML
     */
    buildControlsHtml(node) {
        switch (node.type) {
            case 'string':
                return `
                    <div class="control">
                        <input type="text" class="node-value-input" value="${node.data.value}" data-key="value">
                    </div>
                `;
            case 'number':
                return `
                    <div class="control">
                        <input type="number" class="node-value-input" value="${node.data.value}" data-key="value" data-type="number">
                    </div>
                `;
            case 'boolean':
                return `
                    <div class="control">
                        <select class="node-value-input" data-key="value" data-type="boolean">
                            <option value="true" ${node.data.value ? 'selected' : ''}>True</option>
                            <option value="false" ${!node.data.value ? 'selected' : ''}>False</option>
                        </select>
                    </div>
                `;
            case 'output':
                return `
                    <div class="control">
                        <label>输出路径:</label>
                        <div class="path-input-container">
                            <input type="text" class="path-input node-value-input" value="${node.data.outputPath || ''}" 
                                   placeholder="选择输出文件路径..." data-key="outputPath">
                            <button class="path-browse-btn" data-action="browse-path" title="选择文件">📄</button>
                        </div>
                    </div>
                    <div class="control">
                        <button class="output-export-btn" data-action="export-json">📄 导出JSON</button>
                    </div>
                `;
            default:
                return '';
        }
    }

    /**
     * 构建输出socket HTML
     */
    buildOutputsHtml(node) {
        let html = '';
        node.outputs.forEach((output) => {
            html += `
                <div class="output">
                    <span class="output-title">${output}</span>
                    <div class="socket output-socket" data-socket="${output}" data-node-id="${node.id}"></div>
                </div>
            `;
        });
        return html;
    }

    /**
     * 绑定socket事件
     */
    bindSocketEvents(nodeEl, node) {
        const sockets = nodeEl.querySelectorAll('.socket');
        sockets.forEach(socket => {
            const isInput = socket.classList.contains('input-socket');
            const socketName = socket.dataset.socket;
            
            socket.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    this.editor.connectionManager.startConnection(e, socket);
                    this.editor.contextMenuManager.hide();
                }
            });
            
            socket.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.editor.contextMenuManager.show(e.clientX, e.clientY, {
                    nodeId: node.id,
                    socketName: socketName,
                    isInput: isInput,
                    isArraySocket: node.type === 'array' && isInput,
                    isObjectSocket: node.type === 'object' && isInput
                });
            });
        });
    }

    /**
     * 绑定控件事件
     */
    bindControlEvents(nodeEl, node) {
        // 值输入框
        nodeEl.querySelectorAll('.node-value-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                let value = e.target.value;
                
                if (e.target.dataset.type === 'number') {
                    value = parseFloat(value) || 0;
                } else if (e.target.dataset.type === 'boolean') {
                    value = value === 'true';
                }
                
                this.updateNodeData(node.id, key, value);
            });
        });

        // 对象节点的键名输入框
        nodeEl.querySelectorAll('.input-key').forEach(input => {
            input.addEventListener('change', (e) => {
                const socketName = e.target.dataset.socket;
                this.updateObjectKey(node.id, socketName, e.target.value);
            });
        });

        // 添加输入按钮
        nodeEl.querySelectorAll('[data-action="add-array-input"]').forEach(btn => {
            btn.addEventListener('click', () => this.addArrayInput(node.id));
        });
        
        nodeEl.querySelectorAll('[data-action="add-object-input"]').forEach(btn => {
            btn.addEventListener('click', () => this.addObjectInput(node.id));
        });

        // 浏览路径按钮
        nodeEl.querySelectorAll('[data-action="browse-path"]').forEach(btn => {
            btn.addEventListener('click', () => this.editor.fileManager.browseOutputPath(node.id));
        });

        // 导出JSON按钮
        nodeEl.querySelectorAll('[data-action="export-json"]').forEach(btn => {
            btn.addEventListener('click', () => this.editor.fileManager.exportJson(node.id));
        });
    }

    /**
     * 删除节点
     */
    deleteNode(nodeId) {
        const node = this.editor.nodes.get(nodeId);
        if (!node) return;
        
        // 删除所有与此节点相关的连接
        const connectionsToRemove = [];
        this.editor.connections.forEach((connection, id) => {
            if (connection.from.nodeId === nodeId || connection.to.nodeId === nodeId) {
                connectionsToRemove.push(id);
            }
        });
        
        connectionsToRemove.forEach(id => {
            this.editor.connectionManager.removeConnection(id);
        });
        
        // 删除节点元素
        const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeEl) nodeEl.remove();
        
        // 从nodes集合中删除
        this.editor.nodes.delete(nodeId);
        
        // 清除选择状态
        if (this.editor.selectionManager.selectedNode?.id === nodeId) {
            this.editor.selectionManager.selectedNode = null;
        }
        
        this.editor.jsonHandler.updateJsonPreview();
        this.editor.sceneManager.markSceneDirty();
    }

    /**
     * 更新节点数据
     */
    updateNodeData(nodeId, key, value) {
        const node = this.editor.nodes.get(nodeId);
        if (node) {
            node.data[key] = value;
            this.editor.jsonHandler.updateJsonPreview();
            this.editor.sceneManager.markSceneDirty();
        }
    }

    /**
     * 添加数组输入socket
     */
    addArrayInput(nodeId) {
        const node = this.editor.nodes.get(nodeId);
        if (node && node.type === 'array') {
            node.inputs.push(`item${node.inputs.length}`);
            this.recreateNodeElement(node);
            this.editor.connectionManager.updateConnections();
            this.editor.sceneManager.markSceneDirty();
        }
    }

    /**
     * 添加对象输入socket
     */
    addObjectInput(nodeId) {
        const node = this.editor.nodes.get(nodeId);
        if (node && node.type === 'object') {
            const newInputName = `input${node.inputs.length}`;
            node.inputs.push(newInputName);
            
            if (!node.data.keys) node.data.keys = {};
            node.data.keys[newInputName] = `key${node.inputs.length - 1}`;
            
            this.recreateNodeElement(node);
            this.editor.connectionManager.updateConnections();
            this.updateObjectInputStyles(node);
            this.editor.sceneManager.markSceneDirty();
        }
    }

    /**
     * 更新对象节点的键名
     */
    updateObjectKey(nodeId, socketName, newKey) {
        const node = this.editor.nodes.get(nodeId);
        if (node && node.type === 'object') {
            if (!node.data.keys) node.data.keys = {};
            node.data.keys[socketName] = newKey;
            
            this.checkObjectDuplicateKeys(node);
            this.editor.jsonHandler.updateJsonPreview();
            this.editor.sceneManager.markSceneDirty();
        }
    }

    /**
     * 删除数组/对象的输入socket
     */
    deleteArrayInput(target) {
        const nodeId = target.nodeId;
        const socketName = target.socketName;
        const node = this.editor.nodes.get(nodeId);
        
        if (node && (node.type === 'array' || node.type === 'object') && node.inputs.length > 1) {
            // 删除对应的连接
            const connectionsToRemove = [];
            this.editor.connections.forEach((connection, id) => {
                if (connection.to.nodeId === nodeId && connection.to.socket === socketName) {
                    connectionsToRemove.push(id);
                }
            });
            connectionsToRemove.forEach(id => this.editor.connectionManager.removeConnection(id));
            
            // 删除输入
            const index = node.inputs.indexOf(socketName);
            if (index > -1) node.inputs.splice(index, 1);
            
            if (node.type === 'object' && node.data.keys) {
                delete node.data.keys[socketName];
            }
            
            this.recreateNodeElement(node);
            this.editor.connectionManager.updateConnections();
            this.editor.jsonHandler.updateJsonPreview();
            this.editor.sceneManager.markSceneDirty();
        }
    }

    /**
     * 重新创建节点元素
     */
    recreateNodeElement(node) {
        const oldNodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
        if (oldNodeEl) oldNodeEl.remove();
        this.createNodeElement(node);
    }

    /**
     * 检查对象节点是否有重复键
     */
    checkObjectDuplicateKeys(node) {
        if (node.type !== 'object' || !node.data.keys) return;

        const connectedKeys = [];
        this.editor.connections.forEach(conn => {
            if (conn.to.nodeId === node.id) {
                connectedKeys.push(node.data.keys[conn.to.socket] || conn.to.socket);
            }
        });

        const keySet = new Set();
        let hasDuplicate = false;
        for (const key of connectedKeys) {
            if (keySet.has(key)) {
                hasDuplicate = true;
                break;
            }
            keySet.add(key);
        }

        const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
        if (nodeEl) {
            nodeEl.classList.toggle('duplicate-keys', hasDuplicate);
        }
        node.data.hasDuplicateKeys = hasDuplicate;
    }

    /**
     * 更新对象节点的输入框连接状态样式
     */
    updateObjectInputStyles(node) {
        if (node.type !== 'object') return;
        
        const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
        if (!nodeElement) return;
        
        const inputElements = nodeElement.querySelectorAll('.input-key');
        node.inputs.forEach((inputSocket, index) => {
            const inputElement = inputElements[index];
            if (inputElement) {
                const isConnected = this.editor.connectionManager.isSocketConnected(node.id, inputSocket, 'input');
                inputElement.classList.toggle('disconnected', !isConnected);
            }
        });
    }

    /**
     * 更新节点属性面板
     */
    updateNodeProperties(node) {
        if (!this.isPropertiesTabVisible()) return;

        const propertiesDiv = document.getElementById('node-properties');
        if (!propertiesDiv) return;

        propertiesDiv.innerHTML = `
            <div class="property-item">
                <label>节点ID:</label>
                <span>${node.id}</span>
            </div>
            <div class="property-item">
                <label>节点类型:</label>
                <span>${node.type}</span>
            </div>
            <div class="property-item">
                <label>位置:</label>
                <span>X: ${Math.round(node.x)}, Y: ${Math.round(node.y)}</span>
            </div>
            <div class="property-item">
                <label>数据:</label>
                <pre>${JSON.stringify(node.data, null, 2)}</pre>
            </div>
        `;
    }

    /**
     * 清除节点属性面板
     */
    clearNodeProperties() {
        if (!this.isPropertiesTabVisible()) return;

        const propertiesDiv = document.getElementById('node-properties');
        if (propertiesDiv) {
            propertiesDiv.innerHTML = '<p class="placeholder">选择一个节点查看属性</p>';
        }
    }

    /**
     * 检查属性标签页是否可见
     */
    isPropertiesTabVisible() {
        const propertiesTab = document.getElementById('properties-tab');
        return propertiesTab?.classList.contains('active');
    }

    /**
     * 对选中的节点进行排序（类似UE蓝图的自动排列）
     */
    sortSelectedNodes() {
        const selectedNodes = [];

        // 收集所有选中的节点
        if (this.editor.selectionManager.selectedNodes.size > 0) {
            // 多选情况
            this.editor.selectionManager.selectedNodes.forEach(nodeId => {
                const node = this.editor.nodes.get(nodeId);
                if (node) {
                    selectedNodes.push(node);
                }
            });
        } else if (this.editor.selectionManager.selectedNode) {
            // 单选情况
            selectedNodes.push(this.editor.selectionManager.selectedNode);
        }

        console.log('选中的节点数量:', selectedNodes.length);

        if (selectedNodes.length < 2) {
            console.log('节点数量少于2，不需要排序');
            return; // 少于2个节点不需要排序
        }

        // 构建节点依赖图
        const nodeLevels = this.calculateNodeLevels(selectedNodes);
        console.log('节点层级:', Object.fromEntries(nodeLevels));

        // 根据层级排列节点
        const startX = 100;
        const startY = 100;
        const layerSpacing = 350; // 层级之间的水平间距

        // 按层级分组节点
        const levels = {};
        selectedNodes.forEach(node => {
            const level = nodeLevels.get(node.id) || 0;
            if (!levels[level]) {
                levels[level] = [];
            }
            levels[level].push(node);
        });

        console.log('层级分组:', levels);

        // 排列节点
        Object.keys(levels).sort((a, b) => a - b).forEach((level, levelIndex) => {
            const nodesInLevel = levels[level];

            // 在每一层中，根据连接关系排序，减少交叉
            this.sortNodesInLayer(nodesInLevel, selectedNodes);

            // 根据节点实际高度计算Y轴位置
            let currentY = startY;
            nodesInLevel.forEach((node) => {
                const newX = startX + levelIndex * layerSpacing;
                const newY = currentY;

                console.log(`节点 ${node.id} 移动到: (${newX}, ${newY})`);

                // 更新节点数据
                node.x = newX;
                node.y = newY;

                // 更新DOM元素位置（节点元素通过dataset.nodeId存储ID）
                const nodeEl = this.editor.nodesLayer.querySelector(`[data-node-id="${node.id}"]`);
                if (nodeEl) {
                    nodeEl.style.left = `${newX}px`;
                    nodeEl.style.top = `${newY}px`;
                } else {
                    console.error(`找不到节点元素: data-node-id="${node.id}"`);
                }

                // 获取节点高度并更新下一节点的Y位置
                const nodeHeight = this.getNodeHeight(node, nodeEl);
                currentY += nodeHeight + 20; // 20是节点间距
            });
        });

        // 更新连接线
        this.editor.connectionManager.updateConnections();

        // 标记场景已修改
        this.editor.sceneManager.markSceneDirty();

        console.log('排序完成');
    }

    /**
     * 计算每个节点的层级（基于连接关系）
     */
    calculateNodeLevels(selectedNodes) {
        const nodeIds = new Set(selectedNodes.map(n => n.id));
        const levels = new Map();
        const visited = new Set();

        console.log('选中的节点ID:', Array.from(nodeIds));
        console.log('所有连接:', Array.from(this.editor.connections.values()));

        // 为每个节点计算层级
        selectedNodes.forEach(node => {
            if (!visited.has(node.id)) {
                this.calculateNodeLevel(node, nodeIds, levels, visited);
            }
        });

        return levels;
    }

    /**
     * 递归计算节点层级
     */
    calculateNodeLevel(node, selectedNodeIds, levels, visited) {
        if (visited.has(node.id)) {
            return levels.get(node.id) || 0;
        }

        visited.add(node.id);

        let maxLevel = 0;

        // 查找该节点的输入连接（即谁是它的前置节点）
        const incomingConnections = this.findIncomingConnections(node, selectedNodeIds);

        incomingConnections.forEach(connection => {
            const sourceNode = this.editor.nodes.get(connection.from.nodeId);
            if (sourceNode) {
                const sourceLevel = this.calculateNodeLevel(sourceNode, selectedNodeIds, levels, visited);
                maxLevel = Math.max(maxLevel, sourceLevel + 1);
            }
        });

        levels.set(node.id, maxLevel);
        return maxLevel;
    }

    /**
     * 查找节点的输入连接
     */
    findIncomingConnections(node, selectedNodeIds) {
        const connections = [];

        this.editor.connections.forEach((connection, id) => {
            // 目标是当前节点，且源节点也在选中的节点中
            if (connection.to && connection.to.nodeId === node.id && selectedNodeIds.has(connection.from.nodeId)) {
                console.log(`节点 ${node.id} 的输入连接:`, connection);
                connections.push(connection);
            }
        });

        console.log(`节点 ${node.id} 总共找到 ${connections.length} 个输入连接`);
        return connections;
    }

    /**
     * 在同一层中排序节点，减少连接线交叉
     */
    sortNodesInLayer(nodes, allSelectedNodes) {
        if (nodes.length < 2) return;

        // 计算每个节点的"权重"
        // 权重 = 该节点在上一层的连接数 + 该节点在下一层的连接数
        const weights = new Map();

        nodes.forEach(node => {
            let weight = 0;

            // 计算来自上一层的连接
            const incoming = this.findIncomingConnectionsFromLayer(node, nodes);
            weight += incoming.length * 2;

            // 计算去往下一层的连接
            const outgoing = this.findOutgoingConnectionsToLayer(node, allSelectedNodes);
            weight += outgoing.length;

            weights.set(node.id, weight);
        });

        // 根据权重和当前Y坐标排序
        nodes.sort((a, b) => {
            const weightDiff = (weights.get(b.id) || 0) - (weights.get(a.id) || 0);
            if (weightDiff !== 0) {
                return weightDiff;
            }
            return a.y - b.y; // 权重相同时，保持相对位置
        });
    }

    /**
     * 查找节点来自指定层的输入连接
     */
    findIncomingConnectionsFromLayer(node, layerNodes) {
        const layerNodeIds = new Set(layerNodes.map(n => n.id));
        const connections = [];

        this.editor.connections.forEach((connection, id) => {
            if (connection.to && connection.to.nodeId === node.id && layerNodeIds.has(connection.from.nodeId)) {
                connections.push(connection);
            }
        });

        return connections;
    }

    /**
     * 查找节点去往其他节点的输出连接
     */
    findOutgoingConnectionsToLayer(node, allNodes) {
        const nodeIds = new Set(allNodes.map(n => n.id));
        const connections = [];

        this.editor.connections.forEach((connection, id) => {
            if (connection.from && connection.from.nodeId === node.id && nodeIds.has(connection.to.nodeId)) {
                connections.push(connection);
            }
        });

        return connections;
    }

    /**
     * 获取节点的高度
     * @param {Object} node - 节点对象
     * @param {HTMLElement} nodeEl - 节点DOM元素
     * @returns {number} 节点高度
     */
    getNodeHeight(node, nodeEl) {
        if (!nodeEl) {
            // 根据节点类型返回默认高度
            const defaultHeights = {
                'object': 120,
                'array': 120,
                'string': 80,
                'number': 80,
                'boolean': 60,
                'null': 60,
                'output': 150
            };
            return defaultHeights[node.type] || 100;
        }

        // 获取实际渲染高度
        return nodeEl.offsetHeight;
    }
}
