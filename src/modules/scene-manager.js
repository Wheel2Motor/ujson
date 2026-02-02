/**
 * 场景状态管理模块
 * 负责管理场景的保存状态、窗口标题更新等
 */

// 获取 Tauri invoke 函数
const invoke = () => window.__TAURI__.core.invoke;

export class SceneManager {
    constructor() {
        this.currentFilePath = null;  // 当前关联的文件路径
        this.isSceneDirty = false;    // 场景是否为脏状态（有未保存的修改）
        this.hasBeenSaved = false;    // 是否曾经保存过
        this.isCleanScene = true;     // 是否为干净场景（初始状态）
        this.closeHandlerSetup = false; // 关闭处理器是否已设置
        this.isClosing = false;       // 是否正在关闭过程中
    }

    /**
     * 更新窗口标题
     */
    async updateWindowTitle() {
        try {
            // 动态获取应用版本号
            let version = "0.1.0";
            try {
                version = await window.__TAURI__.app.getVersion();
            } catch (e) {
                console.warn('无法获取应用版本号，使用默认版本');
            }
            
            let title = `UJson ${version}`;
            
            if (this.currentFilePath) {
                title += ` -- ${this.currentFilePath}`;
                if (this.isSceneDirty) {
                    title += "*";
                }
            } else if (this.isSceneDirty || !this.isCleanScene) {
                title += " -- 未保存*";
            } else {
                title += " -- 新场景";
            }
            
            await invoke()('update_window_title', { title });
        } catch (error) {
            console.error('更新窗口标题失败:', error);
        }
    }

    /**
     * 标记场景为脏状态
     */
    markSceneDirty() {
        if (!this.isSceneDirty) {
            console.log('标记场景为脏状态');
            this.isSceneDirty = true;
            this.isCleanScene = false;
            this.updateWindowTitle();
        }
    }

    /**
     * 标记场景为已保存
     * @param {string|null} filePath - 文件路径
     */
    markSceneSaved(filePath = null) {
        console.log('标记场景为已保存, filePath:', filePath);
        this.isSceneDirty = false;
        this.hasBeenSaved = true;
        this.isCleanScene = false;
        if (filePath) {
            this.currentFilePath = filePath;
        }
        this.updateWindowTitle();
        console.log('场景状态已更新:', {
            isSceneDirty: this.isSceneDirty,
            hasBeenSaved: this.hasBeenSaved,
            currentFilePath: this.currentFilePath
        });
    }

    /**
     * 重置为新场景状态
     */
    resetToNewScene() {
        this.currentFilePath = null;
        this.isSceneDirty = false;
        this.hasBeenSaved = false;
        this.isCleanScene = true;
        this.updateWindowTitle();
    }

    /**
     * 设置窗口关闭处理器
     * @param {Function} handleCloseRequest - 关闭请求处理函数
     */
    setupCloseHandler(handleCloseRequest) {
        if (window.__TAURI__ && !this.closeHandlerSetup) {
            const { listen } = window.__TAURI__.event;
            listen('close-requested', async () => {
                console.log('收到关闭请求事件');
                await handleCloseRequest();
            });
            this.closeHandlerSetup = true;
            console.log('关闭处理器已设置');
        }
    }

    /**
     * 关闭应用程序
     */
    async closeApplication() {
        console.log('开始执行关闭应用程序');
        try {
            await invoke()('close_application');
            console.log('关闭命令已发送');
        } catch (error) {
            console.error('关闭应用程序失败:', error);
            try {
                if (window.__TAURI__) {
                    const { exit } = window.__TAURI__.process;
                    await exit(0);
                }
            } catch (fallbackError) {
                console.error('备用关闭方法也失败:', fallbackError);
                window.close();
            }
        }
    }

    /**
     * 测试关闭逻辑（开发用）
     * @param {Function} handleCloseRequest - 关闭请求处理函数
     */
    testCloseLogic(handleCloseRequest) {
        console.log('测试关闭逻辑');
        console.log('当前状态:', {
            isSceneDirty: this.isSceneDirty,
            isClosing: this.isClosing,
            currentFilePath: this.currentFilePath,
            hasBeenSaved: this.hasBeenSaved
        });
        handleCloseRequest();
    }
}
