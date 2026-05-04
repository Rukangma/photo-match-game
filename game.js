// 游戏配置
const LEVEL_CONFIG = {
    1: { rows: 4, cols: 4, layers: 2, slotLimit: 4, pairs: 4 },
    2: { rows: 5, cols: 5, layers: 3, slotLimit: 4, pairs: 6 },
    3: { rows: 6, cols: 6, layers: 4, slotLimit: 4, pairs: 8 }
};

// 游戏图片数组（由用户照片和默认照片组成）
const IMAGES = [];

// 游戏状态
let currentLevel = 1;
let score = 0;
let slot = [];
let cards = [];
let selectedImages = [];
let isMusicOn = true;
let audioContext = null;
let bgMusicInterval = null;
let bgMusicOsc = null;
let isLoading = false;
let loadedImages = new Set();

// 预加载图片
function preloadImages(imageUrls, callback) {
    let loaded = 0;
    const total = imageUrls.length;
    
    imageUrls.forEach(url => {
        if (loadedImages.has(url)) {
            loaded++;
            if (loaded === total && callback) callback();
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            loadedImages.add(url);
            loaded++;
            if (loaded === total && callback) callback();
        };
        img.onerror = () => {
            loaded++;
            if (loaded === total && callback) callback();
        };
        img.src = url;
    });
}

// DOM元素
const gameContainer = document.querySelector('.game-container');
const gameArea = document.getElementById('gameArea');
const slotElement = document.getElementById('slot');
const slotWarning = document.getElementById('slotWarning');
const scoreElement = document.getElementById('score');
const currentLevelElement = document.getElementById('currentLevel');

const homeScreen = document.getElementById('homeScreen');
const startBtn = document.getElementById('startBtn');
const levelButtons = document.querySelectorAll('.level-btn');

const gameOverModal = document.getElementById('gameOverModal');
const winModal = document.getElementById('winModal');
const restartBtn = document.getElementById('restartBtn');
const homeBtn = document.getElementById('homeBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const musicToggle = document.getElementById('musicToggle');

// 初始化音频上下文
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// 播放点击音效
function playClickSound() {
    if (!isMusicOn) return;
    initAudio();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
}

// 播放匹配音效
function playMatchSound() {
    if (!isMusicOn) return;
    initAudio();
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            osc.start();
            osc.stop(audioContext.currentTime + 0.2);
        }, i * 100);
    });
}

// 播放胜利音效
function playWinSound() {
    if (!isMusicOn) return;
    initAudio();
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            osc.start();
            osc.stop(audioContext.currentTime + 0.3);
        }, i * 80);
    });
}

// 播放失败音效
function playLoseSound() {
    if (!isMusicOn) return;
    initAudio();
    const notes = [400, 350, 300, 250];
    notes.forEach((freq, i) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            osc.start();
            osc.stop(audioContext.currentTime + 0.3);
        }, i * 150);
    });
}

// 播放背景音乐
function startBgMusic() {
    if (!isMusicOn) return;
    initAudio();
    stopBgMusic();
    
    const melody = [262, 294, 330, 349, 392, 349, 330, 294];
    let noteIndex = 0;
    
    function playNote() {
        if (!isMusicOn) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = melody[noteIndex];
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        osc.start();
        osc.stop(audioContext.currentTime + 0.4);
        noteIndex = (noteIndex + 1) % melody.length;
    }
    
    playNote();
    bgMusicInterval = setInterval(playNote, 500);
}

// 停止背景音乐
function stopBgMusic() {
    if (bgMusicInterval) {
        clearInterval(bgMusicInterval);
        bgMusicInterval = null;
    }
    if (bgMusicOsc) {
        bgMusicOsc.stop();
        bgMusicOsc = null;
    }
}

// 切换音乐开关
function toggleMusic() {
    isMusicOn = !isMusicOn;
    musicToggle.textContent = isMusicOn ? '🔊' : '🔇';
    musicToggle.classList.toggle('muted', !isMusicOn);
    
    if (isMusicOn) {
        startBgMusic();
    } else {
        stopBgMusic();
    }
}

musicToggle.addEventListener('click', toggleMusic);

// 初始化关卡选择
levelButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        levelButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLevel = parseInt(btn.dataset.level);
    });
});

// 开始游戏
startBtn.addEventListener('click', () => {
    if (isLoading) return;

    if (IMAGES.length < 12) {
        alert(`照片数量不足！当前有 ${IMAGES.length} 张照片，需要至少 12 张照片。\n请点击"确定"去添加照片。`);
        openPhotoManager();
        return;
    }

    isLoading = true;
    gameContainer.classList.add('game-started');

    const config = LEVEL_CONFIG[currentLevel];
    const imagesToLoad = IMAGES.slice(0, config.pairs);

    preloadImages(imagesToLoad, () => {
        if (isMusicOn) {
            startBgMusic();
        }
        initGame();
        isLoading = false;
    });
});

// 重新开始
restartBtn.addEventListener('click', () => {
    closeModal(gameOverModal);
    if (isMusicOn) {
        startBgMusic();
    }
    initGame();
});

// 返回首页
homeBtn.addEventListener('click', () => {
    closeModal(gameOverModal);
    goHome();
});

backHomeBtn.addEventListener('click', () => {
    closeModal(winModal);
    goHome();
});

// 下一关
nextLevelBtn.addEventListener('click', () => {
    closeModal(winModal);
    if (currentLevel < 3) {
        currentLevel++;
        document.querySelector('.level-btn.active').classList.remove('active');
        document.querySelector(`.level-btn[data-level="${currentLevel}"]`).classList.add('active');
        if (isMusicOn) {
            startBgMusic();
        }
        initGame();
    }
});

// 初始化游戏
function initGame() {
    score = 0;
    slot = [];
    cards = [];
    updateScore();
    updateLevelDisplay();
    clearSlot();
    generateCards();
}

// 更新得分显示
function updateScore() {
    scoreElement.textContent = score;
}

// 更新关卡显示
function updateLevelDisplay() {
    currentLevelElement.textContent = currentLevel;
}

// 清空槽位
function clearSlot() {
    slotElement.innerHTML = '';
    slotElement.classList.remove('slot-full');
    slotWarning.style.display = 'none';
}

// 生成卡片
function generateCards() {
    gameArea.innerHTML = '';
    const config = LEVEL_CONFIG[currentLevel];
    const { rows, cols, layers, pairs } = config;
    
    // 按顺序选择图片（第1关用前4张，第2关用前6张，第3关用前8张）
    selectedImages = IMAGES.slice(0, pairs);
    
    // 计算每种图片的数量（必须是3的倍数）
    const totalPositions = rows * cols * layers;
    const cardsPerImage = Math.floor(totalPositions / pairs);
    // 确保每种图片数量是3的倍数
    const cardsPerImageMultipleOf3 = Math.floor(cardsPerImage / 3) * 3;
    
    // 计算总卡片数
    const totalCards = cardsPerImageMultipleOf3 * pairs;
    
    // 创建卡片数据（每种图片数量相同且都是3的倍数）
    const cardData = [];
    let cardId = 0;
    
    for (let imageIndex = 0; imageIndex < pairs; imageIndex++) {
        for (let j = 0; j < cardsPerImageMultipleOf3; j++) {
            cardData.push({
                id: cardId++,
                imageIndex: imageIndex,
                imageUrl: selectedImages[imageIndex],
                layer: 0,
                row: 0,
                col: 0,
                removed: false
            });
        }
    }
    
    // 随机打乱
    shuffleArray(cardData);
    
    // 重新分配位置
    cardData.forEach((card, index) => {
        card.layer = Math.floor(index / (rows * cols));
        card.row = Math.floor((index % (rows * cols)) / cols);
        card.col = index % cols;
    });
    
    cards = cardData;
    
    // 创建DOM元素
    cards.forEach(card => {
        createCardElement(card);
    });
    
    updateClickableCards();
}

// 计算卡片尺寸和间距
function getCardDimensions() {
    const containerWidth = gameArea.offsetWidth || Math.min(window.innerWidth, 500);
    const gap = 4;
    let cardWidth = (containerWidth - 20) / 6;
    cardWidth = Math.min(Math.max(cardWidth, 40), 60);
    const cardHeight = cardWidth * 1.33;
    return { cardWidth, cardHeight, gap };
}

// 创建卡片元素
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.id = card.id;
    cardElement.dataset.layer = card.layer;
    cardElement.dataset.row = card.row;
    cardElement.dataset.col = card.col;
    
    // 动态计算位置
    const { cardWidth, cardHeight, gap } = getCardDimensions();
    const offsetX = card.layer * 3;
    const offsetY = card.layer * 3;
    const paddingLeft = 10;
    const paddingTop = 10;
    
    cardElement.style.left = `${card.col * (cardWidth + gap) + offsetX + paddingLeft}px`;
    cardElement.style.top = `${card.row * (cardHeight + gap) + offsetY + paddingTop}px`;
    cardElement.style.zIndex = card.layer * 10 + card.row;
    
    const img = document.createElement('img');
    img.alt = `Card ${card.id}`;
    
    // 使用base64占位符提高加载速度
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"%3E%3Crect fill="%23f0f0f0" width="60" height="80"/%3E%3Ctext fill="%23ccc" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E加载中...%3C/text%3E%3C/svg%3E';
    img.dataset.src = card.imageUrl;
    
    cardElement.appendChild(img);
    gameArea.appendChild(cardElement);
    
    // 懒加载图片
    lazyLoadImage(img, card.imageUrl);
    
    // 添加点击事件
    cardElement.addEventListener('click', () => {
        handleCardClick(card);
    });
}

// 懒加载图片
function lazyLoadImage(img, src) {
    if (loadedImages.has(src)) {
        img.src = src;
        img.classList.add('loaded');
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                img.onload = () => {
                    img.classList.add('loaded');
                    loadedImages.add(src);
                };
                img.src = src;
                observer.disconnect();
            }
        });
    }, {
        rootMargin: '100px'
    });
    
    observer.observe(img);
}

// 处理卡片点击
function handleCardClick(card) {
    if (card.removed) return;
    
    const config = LEVEL_CONFIG[currentLevel];
    
    // 检查是否可点击（没有被其他卡片覆盖）
    if (!isCardClickable(card)) return;
    
    // 检查槽位是否已满
    if (slot.length >= config.slotLimit) {
        slotWarning.style.display = 'block';
        setTimeout(() => {
            slotWarning.style.display = 'none';
        }, 1000);
        return;
    }
    
    // 添加到槽位
    slot.push(card);
    addToSlot(card);
    playClickSound();
    
    // 标记卡片为已选中并立即移除DOM元素
    card.removed = true;
    const cardElement = document.querySelector(`.card[data-id="${card.id}"]`);
    if (cardElement) {
        cardElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
            cardElement.remove();
        }, 200);
    }
    
    // 检查是否有匹配
    checkMatch();
    
    // 更新可点击卡片
    updateClickableCards();
    
    // 检查是否获胜
    checkWin();
}

// 检查卡片是否可点击
function isCardClickable(card) {
    if (card.removed) return false;
    
    const activeCards = cards.filter(c => !c.removed);
    
    // 检查是否被上层卡片覆盖
    for (const other of activeCards) {
        if (other.layer > card.layer) {
            // 检查是否有重叠
            const overlapX = Math.abs(other.col - card.col) < 1;
            const overlapY = Math.abs(other.row - card.row) < 1;
            if (overlapX && overlapY) {
                return false;
            }
        }
    }
    
    return true;
}

// 更新可点击卡片样式
function updateClickableCards() {
    document.querySelectorAll('.card').forEach(cardElement => {
        const id = parseInt(cardElement.dataset.id);
        const card = cards.find(c => c.id === id);
        if (card && !card.removed && isCardClickable(card)) {
            cardElement.classList.add('clickable');
        } else {
            cardElement.classList.remove('clickable');
        }
    });
}

// 添加到槽位
function addToSlot(card) {
    const slotItem = document.createElement('div');
    slotItem.className = 'slot-item';
    slotItem.dataset.cardId = card.id;
    
    const img = document.createElement('img');
    img.alt = `Slot ${card.id}`;
    
    // 使用缓存的图片或立即加载
    if (loadedImages.has(card.imageUrl)) {
        img.src = card.imageUrl;
    } else {
        // 使用base64占位符
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"%3E%3Crect fill="%23f0f0f0" width="60" height="80"/%3E%3C/svg%3E';
        img.onload = () => {
            img.src = card.imageUrl;
        };
    }
    
    slotItem.appendChild(img);
    slotElement.appendChild(slotItem);
    
    // 更新槽位样式
    const config = LEVEL_CONFIG[currentLevel];
    if (slot.length >= config.slotLimit) {
        slotElement.classList.add('slot-full');
    }
}

// 检查匹配
function checkMatch() {
    const config = LEVEL_CONFIG[currentLevel];
    
    // 统计每种图片的数量
    const counts = {};
    slot.forEach(card => {
        const key = card.imageIndex;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    // 检查是否有3张相同的
    for (const [key, count] of Object.entries(counts)) {
        if (count >= 3) {
            // 找到并消除这3张
            const toRemove = slot.filter(c => c.imageIndex === parseInt(key)).slice(0, 3);
            removeFromSlot(toRemove);
            playMatchSound();
            
            // 加分
            score += 100 * currentLevel;
            updateScore();
            
            break;
        }
    }
}

// 从槽位移除
function removeFromSlot(cardsToRemove) {
    cardsToRemove.forEach(card => {
        const index = slot.indexOf(card);
        if (index > -1) {
            slot.splice(index, 1);
        }
        
        const slotItem = document.querySelector(`.slot-item[data-card-id="${card.id}"]`);
        if (slotItem) {
            slotItem.classList.add('remove');
            setTimeout(() => {
                slotItem.remove();
                slotElement.classList.remove('slot-full');
            }, 300);
        }
    });
}

// 检查是否获胜
function checkWin() {
    const remainingCards = cards.filter(c => !c.removed);
    
    // 胜利条件：游戏区域没有剩余卡片 并且 槽位也没有剩余卡片
    if (remainingCards.length === 0 && slot.length === 0) {
        // 胜利！
        setTimeout(() => {
            showWinModal();
        }, 500);
    } else if (remainingCards.length === 0 && slot.length > 0) {
        // 游戏区域没有卡片了，但槽位还有卡片（无法继续游戏）
        setTimeout(() => {
            showGameOverModal();
        }, 500);
    } else if (slot.length >= LEVEL_CONFIG[currentLevel].slotLimit) {
        // 槽位已满，游戏结束
        setTimeout(() => {
            showGameOverModal();
        }, 500);
    }
}

// 显示游戏结束弹窗
function showGameOverModal() {
    playLoseSound();
    stopBgMusic();
    document.getElementById('finalScore').textContent = score;
    gameOverModal.classList.add('active');
}

// 显示胜利弹窗
function showWinModal() {
    playWinSound();
    stopBgMusic();
    document.getElementById('winLevel').textContent = currentLevel;
    document.getElementById('winScore').textContent = score;
    
    // 最后一关禁用下一关按钮
    if (currentLevel >= 3) {
        nextLevelBtn.style.display = 'none';
    } else {
        nextLevelBtn.style.display = 'inline-block';
    }
    
    winModal.classList.add('active');
}

// 关闭弹窗
function closeModal(modal) {
    modal.classList.remove('active');
}

// 返回首页
function goHome() {
    gameContainer.classList.remove('game-started');
    currentLevel = 1;
}

// 数组随机打乱
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 重新布局所有卡片
function reLayoutCards() {
    const { cardWidth, cardHeight, gap } = getCardDimensions();
    const paddingLeft = 10;
    const paddingTop = 10;
    
    document.querySelectorAll('.card').forEach(cardElement => {
        const col = parseInt(cardElement.dataset.col);
        const row = parseInt(cardElement.dataset.row);
        const layer = parseInt(cardElement.dataset.layer);
        
        const offsetX = layer * 3;
        const offsetY = layer * 3;
        
        cardElement.style.left = `${col * (cardWidth + gap) + offsetX + paddingLeft}px`;
        cardElement.style.top = `${row * (cardHeight + gap) + offsetY + paddingTop}px`;
    });
}

// 窗口大小改变时重新布局
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (gameContainer.classList.contains('game-started')) {
            reLayoutCards();
        }
    }, 100);
});

// 默认示例照片（免费图片素材 - 用户可自行删除和添加）
const DEFAULT_PHOTOS = [];

// 用户照片存储
let userPhotos = [];
const STORAGE_KEY = 'photo_match_user_photos';

// 照片管理DOM元素
const photoManagerModal = document.getElementById('photoManagerModal');
const photoList = document.getElementById('photoList');
const addPhotoBtn = document.getElementById('addPhotoBtn');
const closePhotoManager = document.getElementById('closePhotoManager');
const photoInput = document.getElementById('photoInput');
const photoManagerBtn = document.getElementById('photoManagerBtn');

// 初始化用户照片
function initUserPhotos() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            userPhotos = JSON.parse(stored);
        } catch (e) {
            userPhotos = [];
        }
    }
}

// 保存用户照片到本地存储
function saveUserPhotos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPhotos));
}

// 获取所有可用照片（只使用用户添加的照片）
function getAllPhotos() {
    return [...userPhotos];
}

// 获取游戏可用的照片数量
function getAvailablePhotoCount() {
    const totalPhotos = getAllPhotos().length;
    return Math.max(8, Math.min(totalPhotos, 10));
}

// 渲染照片列表
function renderPhotoList() {
    const allPhotos = getAllPhotos();
    photoList.innerHTML = '';

    if (allPhotos.length === 0) {
        photoList.innerHTML = '<div class="photo-empty">还没有照片，请点击"添加照片"按钮添加</div>';
    } else {
        allPhotos.forEach((photoUrl, index) => {
            const item = document.createElement('div');
            item.className = 'photo-item';

            const img = document.createElement('img');
            img.src = photoUrl;
            img.alt = `照片 ${index + 1}`;
            img.onerror = () => {
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="12" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E图片失效%3C/text%3E%3C/svg%3E';
            };

            item.appendChild(img);

            // 如果是用户照片，显示删除按钮
            if (index >= DEFAULT_PHOTOS.length) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '×';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteUserPhoto(index - DEFAULT_PHOTOS.length);
                };
                item.appendChild(deleteBtn);
            }

            photoList.appendChild(item);
        });

        // 预加载所有图片
        allPhotos.forEach(photoUrl => {
            const img = new Image();
            img.src = photoUrl;
        });
    }
}

// 删除用户照片
function deleteUserPhoto(photoIndex) {
    if (photoIndex >= 0 && photoIndex < userPhotos.length) {
        userPhotos.splice(photoIndex, 1);
        saveUserPhotos();
        updateImagesArray();
        renderPhotoList();
    }
}

// 添加照片
function addPhotos(files) {
    let validCount = 0;
    const maxPhotos = 20;
    const currentTotal = userPhotos.length + DEFAULT_PHOTOS.length;
    const availableSlots = maxPhotos - currentTotal;

    if (availableSlots <= 0) {
        alert('照片数量已达上限（20张）');
        return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);

    filesToProcess.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 压缩并转换为base64
                const canvas = document.createElement('canvas');
                const maxSize = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                userPhotos.push(base64);
                validCount++;

                if (validCount === filesToProcess.length) {
                    saveUserPhotos();
                    updateImagesArray();
                    renderPhotoList();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 打开照片管理
function openPhotoManager() {
    renderPhotoList();
    photoManagerModal.classList.add('active');
}

// 关闭照片管理
function closePhotoManagerFunc() {
    photoManagerModal.classList.remove('active');
}

// 照片管理事件绑定
photoManagerBtn.addEventListener('click', openPhotoManager);
closePhotoManager.addEventListener('click', closePhotoManagerFunc);
addPhotoBtn.addEventListener('click', () => {
    photoInput.click();
});
photoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        addPhotos(e.target.files);
        photoInput.value = '';
    }
});

// 初始化用户照片
initUserPhotos();

// 更新IMAGES数组为所有可用照片
function updateImagesArray() {
    IMAGES.length = 0;
    const allPhotos = getAllPhotos();
    allPhotos.forEach(photo => {
        IMAGES.push(photo);
    });
}
updateImagesArray();
