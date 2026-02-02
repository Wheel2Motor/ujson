/**
 * 选择和框选管理模块
 * 负责单选、多选和框选功能
 */

export class SelectionManager {
    constructor(editor) {
        this.editor = editor;
        this.selectedNode = null;
        this.selectedNodes = new Set();  // 多选的节点ID集合
        this.isBoxSelecting = false;     // 是否正在框选
        this.boxSelectStart = { x: 0, y: 0 };  // 框选起始点（屏幕坐标）
        this.boxSelectEnd = { x: 0, y: 0 };    // 框选结束点（屏幕坐标）
        this.selectionBox = null;        // 选框DOM元素
        this.justFinishedBoxSelection = false;  // 标记刚完成框选
    }

    /**
     * 选中节点
     * @param {Object} node - 节点对象
     * @param {boolean} shouldBlurInput - 是否触发输入框失焦
     * @param {boolean} isShiftPressed - 是否按住Shift
     * @param {boolean} isCtrlPressed - 是否按住Ctrl
     * @param {boolean} isClick - 是否为点击操作（非拖动）
     */
    selectNode(node, shouldBlurInput = true, isShiftPressed = false, isCtrlPressed = false, isClick = false) {
        // 先让当前聚焦的输入框失焦，确保其内容被commit
        if (shouldBlurInput && document.activeElement && document.activeElement.tagName.match(/^(INPUT|TEXTAREA|SELECT)$/i)) {
            document.activeElement.blur();
        }

        const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);

        if (isShiftPressed) {
            // Shift加选：添加到多选
            if (!this.selectedNodes.has(node.id)) {
                this.selectedNodes.add(node.id);
                nodeEl?.classList.add('multi-selected');
                nodeEl?.classList.add('selected'); // 同时也添加selected类
            }
        } else if (isCtrlPressed) {
            // Ctrl减选：从多选中移除
            if (this.selectedNodes.has(node.id)) {
                this.selectedNodes.delete(node.id);
                nodeEl?.classList.remove('multi-selected');
                nodeEl?.classList.remove('selected'); // 同时也移除selected类
            }
        } else {
            // 普通点击：清除之前的选择，选中当前节点
            this.deselectNode();
            this.clearMultiSelection();
            this.selectedNode = node;
            nodeEl?.classList.add('selected');
        }

        // 触发选中回调
        if (this.onNodeSelected) {
            this.onNodeSelected(node);
        }
    }

    /**
     * 取消选中节点
     */
    deselectNode() {
        if (this.selectedNode) {
            const nodeEl = document.querySelector(`[data-node-id="${this.selectedNode.id}"]`);
            if (nodeEl) {
                nodeEl.classList.remove('selected');
            }
            this.selectedNode = null;
        }
        
        // 触发取消选中回调
        if (this.onNodeDeselected) {
            this.onNodeDeselected();
        }
    }

    /**
     * 获取选中的节点数量
     * @returns {number}
     */
    getSelectedNodeCount() {
        return this.selectedNode ? 1 : 0;
    }

    // ========== 框选功能 ==========

    /**
     * 开始框选
     * @param {number} x - 起始X坐标
     * @param {number} y - 起始Y坐标
     */
    startBoxSelection(x, y) {
        this.isBoxSelecting = true;
        this.boxSelectStart = { x, y };
        this.boxSelectEnd = { x, y };
        this.createSelectionBox();
    }

    /**
     * 更新框选
     * @param {number} x - 当前X坐标
     * @param {number} y - 当前Y坐标
     */
    updateBoxSelection(x, y) {
        if (!this.isBoxSelecting) return;
        this.boxSelectEnd = { x, y };
        this.updateSelectionBox();
    }

    /**
     * 创建选框元素
     */
    createSelectionBox() {
        if (this.selectionBox) {
            this.selectionBox.remove();
        }
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.position = 'fixed';
        this.selectionBox.style.border = '1px dashed #0e639c';
        this.selectionBox.style.backgroundColor = 'rgba(14, 99, 156, 0.1)';
        this.selectionBox.style.pointerEvents = 'none';
        this.selectionBox.style.zIndex = '1000';
        document.body.appendChild(this.selectionBox);
        this.updateSelectionBox();
    }

    /**
     * 更新选框位置和大小
     */
    updateSelectionBox() {
        if (!this.selectionBox) return;
        
        const left = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const top = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const width = Math.abs(this.boxSelectEnd.x - this.boxSelectStart.x);
        const height = Math.abs(this.boxSelectEnd.y - this.boxSelectStart.y);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }

    /**
     * 完成框选
     * @param {Map} nodes - 所有节点的Map
     */
    finishBoxSelection(nodes) {
        // 获取选框的屏幕坐标范围
        const boxLeft = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const boxTop = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const boxRight = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
        const boxBottom = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
        
        // 移除选框
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        
        // 如果选框太小（小于5像素），视为点击而非框选
        const boxWidth = boxRight - boxLeft;
        const boxHeight = boxBottom - boxTop;
        if (boxWidth < 5 && boxHeight < 5) {
            this.isBoxSelecting = false;
            return;
        }
        
        // 标记刚完成框选
        this.justFinishedBoxSelection = true;
        
        // 清除之前的多选
        this.clearMultiSelection();
        
        // 检查哪些节点在选框内
        nodes.forEach((node, nodeId) => {
            const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeEl) {
                const rect = nodeEl.getBoundingClientRect();
                
                // 检查节点是否与选框相交
                if (rect.left < boxRight && rect.right > boxLeft &&
                    rect.top < boxBottom && rect.bottom > boxTop) {
                    this.selectedNodes.add(nodeId);
                    nodeEl.classList.add('multi-selected');
                }
            }
        });
        
        this.isBoxSelecting = false;
        console.log('Box selection finished, selected nodes:', Array.from(this.selectedNodes));
    }

    /**
     * 清除多选
     */
    clearMultiSelection() {
        this.selectedNodes.forEach(nodeId => {
            const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeEl) {
                nodeEl.classList.remove('multi-selected');
                nodeEl.classList.remove('selected'); // 同时也移除selected类
            }
        });
        this.selectedNodes.clear();
    }

    /**
     * 确保所有选中节点显示正确的选中状态
     */
    ensureSelectedNodesDisplay() {
        this.selectedNodes.forEach(nodeId => {
            const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeEl) {
                nodeEl.classList.add('selected');
                if (this.selectedNodes.size > 1) {
                    nodeEl.classList.add('multi-selected');
                }
            }
        });
    }

    /**
     * 选中所有节点
     * @param {Map} nodes - 所有节点的Map
     */
    selectAllNodes(nodes) {
        // 清除之前的选中
        this.deselectNode();
        this.clearMultiSelection();

        // 选中所有节点
        nodes.forEach((node, nodeId) => {
            this.selectedNodes.add(nodeId);
            const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeEl) {
                nodeEl.classList.add('multi-selected');
            }
        });

        console.log('Selected all nodes, count:', this.selectedNodes.size);
    }

    /**
     * 删除多选的节点
     * @param {Function} deleteNodeFn - 删除节点的函数
     */
    deleteSelectedNodes(deleteNodeFn) {
        if (this.selectedNodes.size === 0) return;

        // 复制一份ID列表
        const nodeIds = Array.from(this.selectedNodes);

        nodeIds.forEach(nodeId => {
            deleteNodeFn(nodeId);
        });

        this.clearMultiSelection();
        console.log('Deleted nodes:', nodeIds);
    }

    /**
     * 重置框选完成标记
     */
    resetBoxSelectionFlag() {
        if (this.justFinishedBoxSelection) {
            this.justFinishedBoxSelection = false;
            return true;  // 返回true表示刚完成框选
        }
        return false;
    }
}
