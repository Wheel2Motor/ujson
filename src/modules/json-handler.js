/**
 * JSON处理模块
 * 负责JSON的生成、预览和转换
 */

export class JsonHandler {
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * 更新JSON预览
     */
    updateJsonPreview() {
        try {
            const preview = document.getElementById('json-preview');
            
            const selectedCount = this.editor.selectionManager.getSelectedNodeCount();
            
            if (selectedCount === 0 || selectedCount > 1) {
                const message = selectedCount === 0 ? 
                    '请选中一个节点以预览Json文本' : 
                    '当前选择了多个不同节点，请选择仅一个节点查看Json文本';
                preview.innerHTML = `<p class="placeholder">${message}</p>`;
                return;
            }
            
            const selectedNode = this.editor.selectionManager.selectedNode;
            if (selectedNode) {
                if (selectedNode.type === 'output') {
                    const connectedNode = this.getConnectedInputNode(selectedNode, '输入');
                    if (connectedNode) {
                        const inputNodeJson = this.nodeToJson(connectedNode);
                        preview.textContent = JSON.stringify(inputNodeJson, null, 2);
                    } else {
                        preview.innerHTML = '<p class="placeholder">没有输入数据，请将其它数据连接到输出节点上</p>';
                    }
                } else {
                    const selectedNodeJson = this.nodeToJson(selectedNode);
                    preview.textContent = JSON.stringify(selectedNodeJson, null, 2);
                }
            }
        } catch (error) {
            console.error('Error updating JSON preview:', error);
            const preview = document.getElementById('json-preview');
            preview.innerHTML = '<p class="placeholder">// 预览生成错误<br>// 请检查节点连接</p>';
        }
    }

    /**
     * 生成JSON
     * @returns {Object}
     */
    generateJson() {
        const outputNodes = Array.from(this.editor.nodes.values()).filter(node => 
            node.type === 'output'
        );
        
        if (outputNodes.length === 0) {
            return {
                "_info": "请添加Output节点并连接其他节点以显示JSON内容"
            };
        }
        
        const outputNode = outputNodes[0];
        const connectedNode = this.getConnectedInputNode(outputNode, '输入');
        
        if (!connectedNode) {
            return {
                "_info": "请将节点连接到Output节点以显示JSON内容"
            };
        }
        
        return this.nodeToJson(connectedNode);
    }

    /**
     * 获取连接到指定输入socket的节点
     * @param {Object} node - 节点对象
     * @param {string} inputSocket - 输入socket名称
     * @returns {Object|null}
     */
    getConnectedInputNode(node, inputSocket) {
        for (const connection of this.editor.connections.values()) {
            if (connection.to.nodeId === node.id && connection.to.socket === inputSocket) {
                return this.editor.nodes.get(connection.from.nodeId);
            }
        }
        return null;
    }

    /**
     * 查找根节点
     * @returns {Array}
     */
    findRootNodes() {
        const connectedNodes = new Set();
        
        this.editor.connections.forEach(conn => {
            connectedNodes.add(conn.to.nodeId);
        });
        
        const rootNodes = [];
        this.editor.nodes.forEach(node => {
            if (!connectedNodes.has(node.id)) {
                rootNodes.push(node);
            }
        });
        
        return rootNodes;
    }

    /**
     * 节点转JSON
     * @param {Object} node - 节点对象
     * @returns {*}
     */
    nodeToJson(node) {
        switch (node.type) {
            case 'object':
                return this.objectNodeToJson(node);
            case 'array':
                return this.arrayNodeToJson(node);
            case 'string':
                return node.data.value || '';
            case 'number':
                return node.data.value || 0;
            case 'boolean':
                return Boolean(node.data.value);
            case 'null':
                return null;
            case 'output':
                return null;
            default:
                return null;
        }
    }

    /**
     * 对象节点转JSON
     * @param {Object} node - 节点对象
     * @returns {Object}
     */
    objectNodeToJson(node) {
        const result = {};
        let index = 0;
        
        this.editor.connections.forEach(conn => {
            if (conn.to.nodeId === node.id) {
                const sourceNode = this.editor.nodes.get(conn.from.nodeId);
                if (sourceNode) {
                    let key;
                    if (node.data.keys && node.data.keys.hasOwnProperty(conn.to.socket)) {
                        key = node.data.keys[conn.to.socket];
                    } else {
                        key = conn.to.socket || `property_${index++}`;
                    }
                    result[key] = this.nodeToJson(sourceNode);
                }
            }
        });
        
        return result;
    }

    /**
     * 数组节点转JSON
     * @param {Object} node - 节点对象
     * @returns {Array}
     */
    arrayNodeToJson(node) {
        const result = [];
        
        this.editor.connections.forEach(conn => {
            if (conn.to.nodeId === node.id) {
                const sourceNode = this.editor.nodes.get(conn.from.nodeId);
                if (sourceNode) {
                    result.push(this.nodeToJson(sourceNode));
                }
            }
        });
        
        return result;
    }

    /**
     * 导入JSON数据
     * @param {Object} jsonData - 要导入的JSON数据
     */
    async importJsonData(jsonData) {
        try {
            // 创建根节点（对象或数组）
            const rootNode = await this.createRootNode(jsonData);
            this.editor.nodeManager.addNodeToScene(rootNode);
            
            // 递归创建子节点和连接
            await this.createChildNodes(rootNode, jsonData, rootNode.x, rootNode.y);
            
            console.log('JSON数据导入成功');
        } catch (error) {
            console.error('导入JSON数据失败:', error);
            throw new Error('导入JSON数据失败: ' + error);
        }
    }

    /**
     * 创建根节点
     * @param {*} jsonData - JSON数据
     * @returns {Object} 根节点对象
     */
    async createRootNode(jsonData) {
        const nodeType = this.determineNodeType(jsonData);
        
        const nodeData = {
            id: this.editor.nodeManager.generateNodeId(),
            type: nodeType,
            x: 100,
            y: 100,
            data: {
                value: jsonData,
                keys: {}
            }
        };
        
        return this.editor.nodeManager.createNode(nodeData);
    }

    /**
     * 确定节点类型
     * @param {*} value - 值
     * @returns {string} 节点类型
     */
    determineNodeType(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        return 'string';
    }

    /**
     * 递归创建子节点和连接
     * @param {Object} parentNode - 父节点
     * @param {*} data - 数据
     * @param {number} parentX - 父节点X坐标
     * @param {number} parentY - 父节点Y坐标
     */
    async createChildNodes(parentNode, data, parentX, parentY) {
        if (typeof data !== 'object' || data === null) {
            // 基本类型，不需要创建子节点
            return;
        }
        
        const nodeType = this.determineNodeType(data);
        const spacing = 150; // 节点之间的间距
        let index = 0;
        
        if (nodeType === 'array') {
            // 处理数组元素
            for (const item of data) {
                const childNode = await this.createRootNode(item);
                childNode.x = parentX + (index % 3) * spacing - spacing;
                childNode.y = parentY + Math.floor(index / 3) * spacing - spacing;
                
                this.editor.nodeManager.addNodeToScene(childNode);
                
                // 创建连接
                const connection = this.createConnection(parentNode, childNode, `item_${index}`);
                this.editor.connectionManager.createConnection(connection);
                
                await this.createChildNodes(childNode, item, childNode.x, childNode.y);
                index++;
            }
        } else if (nodeType === 'object') {
            // 处理对象属性
            const keys = Object.keys(data);
            for (const key of keys) {
                const childNode = await this.createRootNode(data[key]);
                childNode.x = parentX + (index % 3) * spacing - spacing;
                childNode.y = parentY + Math.floor(index / 3) * spacing - spacing;
                
                this.editor.nodeManager.addNodeToScene(childNode);
                
                // 创建连接
                const connection = this.createConnection(parentNode, childNode, key);
                this.editor.connectionManager.createConnection(connection);
                
                await this.createChildNodes(childNode, data[key], childNode.x, childNode.y);
                index++;
            }
        }
    }

    /**
     * 创建连接
     * @param {Object} fromNode - 源节点
     * @param {Object} toNode - 目标节点
     * @param {string} socketName - socket名称
     * @returns {Object} 连接对象
     */
    createConnection(fromNode, toNode, socketName) {
        return {
            id: this.editor.connectionManager.generateConnectionId(),
            from: {
                nodeId: fromNode.id,
                socket: '输出'
            },
            to: {
                nodeId: toNode.id,
                socket: socketName
            }
        };
    }
}
