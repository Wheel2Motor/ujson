/**
 * 画布事件处理模块
 * 负责画布的平移、缩放、拖拽等操作
 */

export class CanvasHandler {
    constructor(editor) {
        this.editor = editor;

        // 画布变换相关
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.minScale = 0.1;
        this.maxScale = 3;

        // 节点拖拽相关
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedNodes = new Map(); // 存储所有被拖动的节点及其初始位置
    }

    /**
     * 初始化SVG设置
     */
    initializeSVG() {
        const largeSize = 10000;
        this.editor.connectionsLayer.style.width = largeSize + 'px';
        this.editor.connectionsLayer.style.height = largeSize + 'px';
        this.editor.connectionsLayer.style.pointerEvents = 'none';
    }

    /**
     * 更新画布变换
     */
    updateCanvasTransform() {
        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
        this.editor.nodesLayer.style.transform = transform;
        this.editor.connectionsLayer.style.transform = transform;
        
        const zoomInfo = document.getElementById('zoom-info');
        if (zoomInfo) {
            zoomInfo.textContent = Math.round(this.scale * 100) + '%';
        }
        
        const zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) {
            zoomSlider.value = Math.round(this.scale * 100);
        }
    }

    /**
     * 设置缩放比例
     * @param {number} newScale - 新的缩放比例
     */
    setScale(newScale) {
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        this.updateCanvasTransform();
        this.editor.connectionManager.updateConnections();
    }

    /**
     * 重置视图
     */
    resetView() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateCanvasTransform();
        this.editor.connectionManager.updateConnections();
    }

    /**
     * 屏幕坐标转画布坐标
     * @param {number} screenX - 屏幕X坐标
     * @param {number} screenY - 屏幕Y坐标
     * @returns {Object} - {x, y}
     */
    screenToCanvas(screenX, screenY) {
        const rect = this.editor.canvas.getBoundingClientRect();
        const canvasX = (screenX - rect.left - this.panX) / this.scale;
        const canvasY = (screenY - rect.top - this.panY) / this.scale;
        return { x: canvasX, y: canvasY };
    }

    /**
     * 画布坐标转屏幕坐标
     * @param {number} canvasX - 画布X坐标
     * @param {number} canvasY - 画布Y坐标
     * @returns {Object} - {x, y}
     */
    canvasToScreen(canvasX, canvasY) {
        const rect = this.editor.canvas.getBoundingClientRect();
        const screenX = canvasX * this.scale + this.panX + rect.left;
        const screenY = canvasY * this.scale + this.panY + rect.top;
        return { x: screenX, y: screenY };
    }

    /**
     * 开始节点拖拽
     * @param {MouseEvent} e - 鼠标事件
     * @param {Object} node - 节点对象
     */
    startNodeDrag(e, node) {
        e.preventDefault();
        e.stopPropagation();

        this.draggedNode = node;
        const canvasPos = this.screenToCanvas(e.clientX, e.clientY);

        // 记录被拖动节点的初始位置
        this.draggedNodeInitialPos = {
            x: node.x,
            y: node.y
        };

        this.dragOffset = {
            x: canvasPos.x - node.x,
            y: canvasPos.y - node.y
        };

        // 收集所有选中的节点及其初始位置
        this.draggedNodes.clear();
        this.draggedNodes.set(node.id, {
            node: node,
            initialX: node.x,
            initialY: node.y
        });

        // 如果有多选，也记录其他选中节点的初始位置
        if (this.editor.selectionManager.selectedNodes.size > 0) {
            this.editor.selectionManager.selectedNodes.forEach(nodeId => {
                if (nodeId !== node.id) {
                    const selectedNode = this.editor.nodes.get(nodeId);
                    if (selectedNode) {
                        this.draggedNodes.set(nodeId, {
                            node: selectedNode,
                            initialX: selectedNode.x,
                            initialY: selectedNode.y
                        });
                    }
                }
            });
        }

        // 记录拖动开始时间
        this.dragStartTime = Date.now();
    }

    /**
     * 画布鼠标按下事件
     * @param {MouseEvent} e - 鼠标事件
     */
    onCanvasMouseDown(e) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            // 中键或Ctrl+左键开始平移
            e.preventDefault();
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this.editor.canvas.classList.add('panning');
        } else if (e.button === 0 && (e.target === this.editor.canvas || e.target === this.editor.nodesLayer)) {
            // 左键点击画布空白处，开始框选
            e.preventDefault();
            this.editor.selectionManager.startBoxSelection(e.clientX, e.clientY);
        } else if (e.button === 0 && e.target.closest('.node')) {
            // 左键点击节点，开始拖动或选择
            e.preventDefault();
            const node = e.target.closest('.node');
            this.startNodeDrag(e, node);
        }
    }

    /**
     * 画布鼠标移动事件
     * @param {MouseEvent} e - 鼠标事件
     */
    onCanvasMouseMove(e) {
        const canvasPos = this.screenToCanvas(e.clientX, e.clientY);

        if (this.isPanning) {
            this.panX = e.clientX - this.panStart.x;
            this.panY = e.clientY - this.panStart.y;
            this.updateCanvasTransform();
            this.editor.connectionManager.updateConnections();
            return;
        }

        // 框选更新
        if (this.editor.selectionManager.isBoxSelecting) {
            this.editor.selectionManager.updateBoxSelection(e.clientX, e.clientY);
            return;
        }

        if (this.draggedNode && Date.now() - this.dragStartTime > 100) {
            // 计算被拖动节点的新位置（基于鼠标位置）
            const newX = canvasPos.x - this.dragOffset.x;
            const newY = canvasPos.y - this.dragOffset.y;

            // 基于被拖动节点的初始位置计算位移量
            const deltaX = newX - this.draggedNodeInitialPos.x;
            const deltaY = newY - this.draggedNodeInitialPos.y;

            // 更新所有被拖动的节点
            this.draggedNodes.forEach((nodeInfo, nodeId) => {
                nodeInfo.node.x = nodeInfo.initialX + deltaX;
                nodeInfo.node.y = nodeInfo.initialY + deltaY;

                const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
                if (nodeEl) {
                    nodeEl.style.left = nodeInfo.node.x + 'px';
                    nodeEl.style.top = nodeInfo.node.y + 'px';
                }
            });

            // 更新被拖动节点的引用（用于下次计算）
            this.draggedNode.x = newX;
            this.draggedNode.y = newY;

            this.editor.connectionManager.updateConnections();
        }

        if (this.editor.connectionManager.isConnecting) {
            this.editor.connectionManager.handleConnectionMove(canvasPos.x, canvasPos.y, e);
        }
    }

    /**
     * 画布鼠标抬起事件
     * @param {MouseEvent} e - 鼠标事件
     */
    onCanvasMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.editor.canvas.classList.remove('panning');
        }

        // 框选完成
        if (this.editor.selectionManager.isBoxSelecting) {
            this.editor.selectionManager.finishBoxSelection(this.editor.nodes);
            return;
        }

        if (this.draggedNode) {
            this.editor.sceneManager.markSceneDirty();
            
            // 拖动结束后，保持所有选中节点的选中状态
            const selectedNodes = new Set(this.editor.selectionManager.selectedNodes);
            
            this.draggedNode = null;
            this.dragOffset = { x: 0, y: 0 };
            this.draggedNodes.clear();
            
            // 确保所有选中的节点都保持选中状态
            selectedNodes.forEach(nodeId => {
                const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
                if (nodeEl) {
                    nodeEl.classList.add('selected');
                    // 确保多选节点也显示multi-selected类
                    if (selectedNodes.size > 1) {
                        nodeEl.classList.add('multi-selected');
                    }
                }
            });
            
            // 确保选中状态正确显示
            this.editor.selectionManager.ensureSelectedNodesDisplay();
        } else if (e.button === 0 && e.target.closest('.node')) {
            // 处理点击节点的情况
            const node = e.target.closest('.node');
            this.editor.selectionManager.selectNode(node, false, false, false, true);
        }

        if (this.editor.connectionManager.isConnecting) {
            this.editor.connectionManager.handleConnectionEnd(e);
        }
    }

    /**
     * 画布点击事件
     * @param {MouseEvent} e - 鼠标事件
     */
    onCanvasClick(e) {
        // 如果刚完成框选，不要清除选择
        if (this.editor.selectionManager.resetBoxSelectionFlag()) {
            return;
        }
        
        if (e.target === this.editor.canvas || e.target === this.editor.nodesLayer) {
            // 先让当前聚焦的输入框失焦
            if (document.activeElement && document.activeElement.tagName.match(/^(INPUT|TEXTAREA|SELECT)$/i)) {
                document.activeElement.blur();
            }
            // 只有在没有拖动的情况下才清除选择
            if (!this.draggedNode) {
                this.editor.selectionManager.deselectNode();
                this.editor.selectionManager.clearMultiSelection();
            }
        }
    }

    /**
     * 画布滚轮事件
     * @param {WheelEvent} e - 滚轮事件
     */
    onCanvasWheel(e) {
        e.preventDefault();
        
        const rect = this.editor.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const beforeZoomX = (mouseX - this.panX) / this.scale;
        const beforeZoomY = (mouseY - this.panY) / this.scale;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));
        
        if (newScale !== this.scale) {
            this.scale = newScale;
            
            this.panX = mouseX - beforeZoomX * this.scale;
            this.panY = mouseY - beforeZoomY * this.scale;
            
            this.updateCanvasTransform();
            this.editor.connectionManager.updateConnections();
        }
    }

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称
     */
    switchTab(tabName) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        const tabPanels = document.querySelectorAll('.tab-panel');
        tabPanels.forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = document.getElementById(`${tabName}-tab`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        if (tabName === 'properties' && this.editor.selectionManager.selectedNode) {
            this.editor.nodeManager.updateNodeProperties(this.editor.selectionManager.selectedNode);
        }
    }

    /**
     * 聚焦到选中节点中心或回到世界原点
     */
    focusOnSelectedNodesOrOrigin() {
        // 检查是否有选中的节点
        const selectedNodes = [];
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

        if (selectedNodes.length > 0) {
            // 计算选中节点的边界框
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            selectedNodes.forEach(node => {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x);
                maxY = Math.max(maxY, node.y);
            });

            // 计算中心点
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            console.log(`聚焦到选中节点中心: (${centerX}, ${centerY})`);

            // 调整pan使中心点位于视口中心
            const rect = this.editor.canvas.getBoundingClientRect();
            const viewportCenterX = rect.width / 2;
            const viewportCenterY = rect.height / 2;

            this.panX = viewportCenterX - centerX * this.scale;
            this.panY = viewportCenterY - centerY * this.scale;
        } else {
            // 没有选中节点，回到世界原点
            console.log('没有选中节点，回到世界原点');
            this.panX = 0;
            this.panY = 0;
        }

        this.updateCanvasTransform();
        this.editor.connectionManager.updateConnections();
    }
}
