/**
 * Nano EPUB Reader - Alpine.js 版本
 * 极简 PC 端 EPUB 阅读器
 */

document.addEventListener('alpine:init', () => {
    Alpine.data('epubReader', () => ({
        // ===== 状态 =====
        bookLoaded: false,
        book: null,
        rendition: null,
        bookTitle: '',
        bookIdentifier: null,  // 用于保存阅读进度
        
        // 章节
        spineItems: [],
        currentSpineIndex: 0,
        toc: [],
        
        // UI 状态
        dragOver: false,
        settingsOpen: false,
        
        // ===== 配置项（带持久化） =====
        config: {
            theme: 'light',
            fontSize: 18,
            readerWidth: 800,
            readingProgress: {}  // 每本书的阅读进度 { bookId: spineIndex }
        },
        
        // ===== 计算属性 =====
        get theme() { return this.config.theme; },
        set theme(val) { this.config.theme = val; this.saveConfig(); },
        
        get fontSize() { return this.config.fontSize; },
        set fontSize(val) { 
            const newVal = Math.max(12, Math.min(28, parseInt(val) || 18));
            if (this.config.fontSize !== newVal) {
                this.config.fontSize = newVal;
                this.saveConfig();
                this.applyStyles();  // 立即应用样式
            }
        },
        
        get readerWidth() { return this.config.readerWidth; },
        set readerWidth(val) { 
            const newVal = Math.max(400, Math.min(1200, parseInt(val) || 800));
            if (this.config.readerWidth !== newVal) {
                this.config.readerWidth = newVal;
                this.saveConfig();
                this.resizeViewer();  // 立即调整宽度
            }
        },
        
        get themeIcon() {
            return { light: '☀', dark: '☾', sepia: '☕' }[this.theme];
        },
        
        get viewerStyle() {
            return { maxWidth: this.readerWidth + 'px' };
        },
        
        // ===== 配置管理 =====
        loadConfig() {
            try {
                const saved = localStorage.getItem('nano-reader-config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // 合并配置，确保不丢失默认值
                    this.config = { ...this.config, ...parsed };
                    // 校验数值范围
                    this.config.fontSize = Math.max(12, Math.min(28, this.config.fontSize));
                    this.config.readerWidth = Math.max(400, Math.min(1200, this.config.readerWidth));
                }
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        },
        
        saveConfig() {
            try {
                localStorage.setItem('nano-reader-config', JSON.stringify(this.config));
            } catch (e) {
                console.error('保存配置失败:', e);
            }
        },
        
        // 保存当前阅读进度
        saveProgress() {
            if (this.bookIdentifier && this.currentSpineIndex > 0) {
                this.config.readingProgress[this.bookIdentifier] = this.currentSpineIndex;
                this.saveConfig();
            }
        },
        
        // 读取上次阅读进度
        getLastProgress(bookId) {
            return this.config.readingProgress[bookId] || 0;
        },
        
        // ===== 初始化 =====
        init() {
            // 加载保存的配置
            this.loadConfig();
            
            // 页面关闭前保存进度
            window.addEventListener('beforeunload', () => {
                this.saveProgress();
            });
            
            // 定期自动保存进度（每 30 秒）
            setInterval(() => this.saveProgress(), 30000);
            
            console.log('配置已加载:', this.config);
        },
        
        // ===== 文件处理 =====
        handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) this.loadBook(file);
        },
        
        handleDrop(e) {
            this.dragOver = false;
            const file = e.dataTransfer.files[0];
            if (file?.name.toLowerCase().endsWith('.epub')) {
                this.loadBook(file);
            }
        },
        
        async loadBook(file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.book = ePub(arrayBuffer);
                await this.book.ready;
                
                this.spineItems = this.book.spine.spineItems || [];
                this.bookTitle = this.book.packaging?.metadata?.title || file.name.replace('.epub', '');
                
                // 生成书籍标识（用于保存进度）
                this.bookIdentifier = this.bookTitle + '_' + file.size;
                
                // 解析目录
                const nav = await this.book.loaded.navigation;
                this.toc = this.parseToc(nav.toc || []);
                
                this.bookLoaded = true;
                
                // 恢复上次阅读进度
                const lastProgress = this.getLastProgress(this.bookIdentifier);
                const startChapter = Math.min(lastProgress, this.spineItems.length - 1);
                
                // 加载章节
                this.$nextTick(() => this.loadChapter(startChapter));
                
            } catch (err) {
                console.error('加载失败:', err);
                alert('加载 EPUB 失败: ' + err.message);
            }
        },
        
        // ===== 目录处理 =====
        parseToc(toc, level = 0) {
            return toc.map(item => ({
                label: item.label,
                href: item.href,
                level,
                spineIndex: this.findSpineIndex(item.href),
                collapsed: level > 0, // 默认展开第一层
                children: item.subitems ? this.parseToc(item.subitems, level + 1) : []
            }));
        },
        
        findSpineIndex(href) {
            if (!href) return -1;
            const cleanHref = href.split('#')[0];
            return this.spineItems.findIndex(item => {
                return item.href === cleanHref || 
                       item.href.endsWith(cleanHref) || 
                       cleanHref.endsWith(item.href);
            });
        },
        
        toggleItem(item) {
            item.collapsed = !item.collapsed;
        },
        
        collapseAll() {
            this.toc.forEach(item => {
                item.collapsed = true;
                item.children.forEach(child => child.collapsed = true);
            });
        },
        
        expandAll() {
            this.toc.forEach(item => {
                item.collapsed = false;
                item.children.forEach(child => child.collapsed = false);
            });
        },
        
        // ===== 章节加载 =====
        async loadChapter(index) {
            if (index < 0 || index >= this.spineItems.length) return;
            
            this.currentSpineIndex = index;
            
            // 滚动到顶部
            this.$refs.readingArea.scrollTo({ top: 0, behavior: 'instant' });
            
            // 销毁旧的 rendition
            if (this.rendition) {
                this.rendition.destroy();
            }
            
            // 创建新的 rendition
            this.rendition = this.book.renderTo(this.$refs.viewer, {
                width: '100%',
                height: '100%',
                flow: 'scrolled-doc'
            });
            
            // 应用样式并显示
            this.applyStyles();
            await this.rendition.display(index);
        },
        
        prevChapter() {
            this.loadChapter(this.currentSpineIndex - 1);
        },
        
        nextChapter() {
            this.loadChapter(this.currentSpineIndex + 1);
        },
        
        // ===== 样式 & 主题 =====
        applyStyles() {
            if (!this.rendition) {
                console.log('applyStyles: rendition 未就绪');
                return;
            }
            
            const colors = {
                light: { bg: '#fff', color: '#333' },
                dark: { bg: '#1a1a1a', color: '#ccc' },
                sepia: { bg: '#f4ecd8', color: '#5b4636' }
            }[this.theme];
            
            console.log('应用样式:', { fontSize: this.fontSize, theme: this.theme });
            
            // 注册主题（包含字体大小）
            this.rendition.themes.register('custom', {
                body: {
                    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif !important',
                    'font-size': `${this.fontSize}px !important`,
                    'line-height': '1.8 !important',
                    'background': colors.bg,
                    'color': colors.color
                },
                'p, div, span, h1, h2, h3, h4, h5, h6': {
                    'font-size': `${this.fontSize}px !important`
                },
                '*': { 
                    'max-width': '100% !important'
                },
                'img': { 
                    'max-width': '100% !important', 
                    'height': 'auto !important' 
                }
            });
            
            // 应用主题
            this.rendition.themes.select('custom');
            
            // 额外调用 fontSize 确保生效
            this.rendition.themes.fontSize(`${this.fontSize}px`);
        },
        
        cycleTheme() {
            const themes = ['light', 'dark', 'sepia'];
            const idx = themes.indexOf(this.theme);
            this.config.theme = themes[(idx + 1) % themes.length];
            this.saveConfig();
            this.applyStyles();  // 立即应用主题
        },
        
        // 重置所有配置
        resetConfig() {
            if (confirm('确定要重置所有设置吗？')) {
                this.config = {
                    theme: 'light',
                    fontSize: 18,
                    readerWidth: 800,
                    readingProgress: {}
                };
                this.saveConfig();
                this.applyStyles();
                this.resizeViewer();
            }
        },
        
        resizeViewer() {
            if (this.rendition) {
                setTimeout(() => this.rendition.resize(), 350);
            }
        },
        
        // ===== 关闭书籍 =====
        closeBook() {
            if (this.rendition) {
                this.rendition.destroy();
                this.rendition = null;
            }
            if (this.book) {
                this.book.destroy();
                this.book = null;
            }
            this.bookLoaded = false;
            this.bookTitle = '';
            this.spineItems = [];
            this.toc = [];
            this.currentSpineIndex = 0;
        }
    }));
});
