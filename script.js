// DOM元素获取
const form = document.getElementById('fopoForm');
const progressFill = document.querySelector('.progress-fill');
const progressPercentage = document.getElementById('progressPercentage');
const submitBtn = document.getElementById('submitBtn');
const resultDiv = document.getElementById('result');
const scoreDisplay = document.getElementById('scoreDisplay');
const interpretation = document.getElementById('interpretation');

// 全局变量
let totalQuestions = 10; // 主要问题数量
let currentProgress = 0;

// Webhook 配置
const WEBHOOK_URL = 'https://joshtsang0916.zeabur.app/webhook-test/02c727e5-4ab0-4754-b271-cb841239f346';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    updateProgress();
    
    // 为所有单选按钮添加事件监听器
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateProgress);
    });
    
    // 表单提交事件
    form.addEventListener('submit', handleSubmit);
});

// 初始化表单
function initializeForm() {
    // 添加平滑滚动到错误位置的功能
    const questions = document.querySelectorAll('.question');
    questions.forEach((question, index) => {
        question.addEventListener('click', function() {
            // 如果这个问题还没有选择答案，高亮显示
            const radios = question.querySelectorAll('input[type="radio"]');
            const hasAnswer = Array.from(radios).some(radio => radio.checked);
            if (!hasAnswer) {
                question.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    question.style.animation = '';
                }, 500);
            }
        });
    });
}

// 更新进度条
function updateProgress() {
    let answeredQuestions = 0;
    
    // 检查主要问题（q1-q10）
    for (let i = 1; i <= totalQuestions; i++) {
        const radios = document.querySelectorAll(`input[name="q${i}"]`);
        if (Array.from(radios).some(radio => radio.checked)) {
            answeredQuestions++;
        }
    }
    
    // 检查email是否填写
    const emailInput = document.querySelector('input[name="email"]');
    const hasEmail = emailInput.value.trim() !== '';
    
    if (hasEmail) {
        answeredQuestions += 1; // 额外加1分用于email
        totalQuestions = 11; // 更新总题数
    } else {
        totalQuestions = 10;
    }
    
    currentProgress = (answeredQuestions / totalQuestions) * 100;
    
    // 更新进度条
    progressFill.style.width = currentProgress + '%';
    progressPercentage.textContent = Math.round(currentProgress);
    
    // 更新提交按钮状态
    const canSubmit = answeredQuestions >= 10 && hasEmail; // 至少完成主要问题和email
    submitBtn.disabled = !canSubmit;
    
    if (canSubmit) {
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = '<span>提交問卷</span> ✨';
    } else {
        submitBtn.style.opacity = '0.6';
        submitBtn.innerHTML = `<span>請完成所有問題 (${answeredQuestions}/10)</span> 🤔`;
    }
}

// 处理表单提交
async function handleSubmit(e) {
    e.preventDefault();
    
    // 验证必填字段
    if (!validateForm()) {
        return;
    }
    
    // 禁用提交按钮并显示加载状态
    setSubmitButtonLoading(true);
    
    try {
        // 计算FOPO分数
        const score = calculateFOPOScore();
        
        // 收集所有数据
        const formData = collectAllFormData(score);
        
        // 发送数据到webhook
        await sendToWebhook(formData);
        
        // 显示成功消息
        showSubmitSuccess();
        
        // 延迟显示结果，让用户看到成功消息
        setTimeout(() => {
            displayResults(score, formData.additionalData);
        }, 1500);
        
    } catch (error) {
        console.error('提交失败:', error);
        showSubmitError(error.message);
    } finally {
        // 重新启用提交按钮
        setSubmitButtonLoading(false);
    }
}

// 表单验证
function validateForm() {
    let isValid = true;
    const errors = [];
    
    // 验证主要问题
    for (let i = 1; i <= 10; i++) {
        const radios = document.querySelectorAll(`input[name="q${i}"]`);
        if (!Array.from(radios).some(radio => radio.checked)) {
            errors.push(`第 ${i} 题尚未回答`);
            isValid = false;
        }
    }
    
    // 验证email
    const emailInput = document.querySelector('input[name="email"]');
    const emailValue = emailInput.value.trim();
    if (!emailValue) {
        errors.push('请填写email地址');
        isValid = false;
    } else if (!isValidEmail(emailValue)) {
        errors.push('请填写有效的email地址');
        isValid = false;
    }
    
    // 如果有错误，显示提示
    if (!isValid) {
        showValidationErrors(errors);
    }
    
    return isValid;
}

// email验证
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 显示验证错误
function showValidationErrors(errors) {
    // 创建错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-errors';
    errorDiv.innerHTML = `
        <div style="background: #ff6b6b; color: white; padding: 15px; border-radius: 10px; margin: 20px 0; animation: fadeIn 0.5s;">
            <h3>⚠️ 请完成以下必填项：</h3>
            <ul style="margin: 10px 0 0 20px;">
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        </div>
    `;
    
    // 移除之前的错误提示
    const existingError = document.querySelector('.validation-errors');
    if (existingError) {
        existingError.remove();
    }
    
    // 插入新的错误提示
    form.insertBefore(errorDiv, document.querySelector('.form-actions'));
    
    // 滚动到错误提示
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 3秒后自动移除错误提示
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// 计算FOPO分数
function calculateFOPOScore() {
    let totalScore = 0;
    
    for (let i = 1; i <= 10; i++) {
        const checkedRadio = document.querySelector(`input[name="q${i}"]:checked`);
        if (checkedRadio) {
            totalScore += parseInt(checkedRadio.value);
        }
    }
    
    return totalScore;
}

// 收集额外数据
function collectAdditionalData() {
    // 收集自我价值选择
    const selfValueChecked = Array.from(document.querySelectorAll('input[name="selfValue"]:checked'))
        .map(cb => cb.value);
    const selfValueOther = document.querySelector('input[name="selfValueOther"]').value.trim();
    
    // 收集信念价值观
    const beliefs = document.querySelector('textarea[name="beliefs"]').value.trim();
    
    // 收集email
    const email = document.querySelector('input[name="email"]').value.trim();
    
    return {
        selfValue: selfValueChecked,
        selfValueOther: selfValueOther,
        beliefs: beliefs,
        email: email
    };
}

// 收集所有表单数据
function collectAllFormData(score) {
    // 收集所有问题的答案
    const answers = {};
    for (let i = 1; i <= 10; i++) {
        const checkedRadio = document.querySelector(`input[name="q${i}"]:checked`);
        answers[`q${i}`] = checkedRadio ? parseInt(checkedRadio.value) : null;
    }
    
    // 收集额外数据
    const additionalData = collectAdditionalData();
    
    // 计算分数等级
    let level, levelText;
    if (score <= 20) {
        level = 'low';
        levelText = '低 FOPO';
    } else if (score <= 35) {
        level = 'medium';
        levelText = '中等 FOPO';
    } else {
        level = 'high';
        levelText = '高 FOPO';
    }
    
    return {
        timestamp: new Date().toISOString(),
        score: score,
        level: level,
        levelText: levelText,
        answers: answers,
        additionalData: additionalData,
        browserInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };
}

// 显示结果
function displayResults(score, additionalData) {
    // 隐藏表单，显示结果
    resultDiv.classList.remove('hidden');
    
    // 设置分数显示样式
    let scoreColor, scoreText;
    if (score <= 20) {
        scoreColor = 'linear-gradient(135deg, #00b894, #00cec9)';
        scoreText = '低 FOPO';
    } else if (score <= 35) {
        scoreColor = 'linear-gradient(135deg, #fdcb6e, #e17055)';
        scoreText = '中等 FOPO';
    } else {
        scoreColor = 'linear-gradient(135deg, #fd79a8, #e84393)';
        scoreText = '高 FOPO';
    }
    
    scoreDisplay.style.background = scoreColor;
    scoreDisplay.innerHTML = `
        <div style="font-size: 0.6em; opacity: 0.9;">${scoreText}</div>
        <div>${score}/50</div>
    `;
    
    // 生成解释文本
    const interpretationText = getScoreInterpretation(score);
    interpretation.innerHTML = interpretationText;
    
    // 保存数据（可以在这里添加发送到服务器的逻辑）
    saveResults(score, additionalData);
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 获取分数解释
function getScoreInterpretation(score) {
    let level, description, suggestions;
    
    if (score <= 20) {
        level = "低 FOPO 水平";
        description = "您對他人看法的在意程度較低，能夠相對自信地做出決定，不太會被他人的評價所影響。這表明您有較強的內在自信和自主性。";
        suggestions = `
            <ul>
                <li>🎯 <strong>保持平衡：</strong>繼續維持這種健康的心態，但也要適度關注他人的建設性反饋</li>
                <li>💪 <strong>發揮優勢：</strong>善用您的自信，在團體中發揮領導作用</li>
                <li>🤝 <strong>幫助他人：</strong>分享您的經驗，幫助那些過度在意他人看法的朋友</li>
                <li>📚 <strong>持續成長：</strong>保持開放的心態學習新知識和技能</li>
            </ul>
        `;
    } else if (score <= 35) {
        level = "中等 FOPO 水平";
        description = "您在某些情況下會在意他人的看法，這是完全正常的。您能在自主性和社會認同之間找到某種平衡，但有時可能還是會受到他人評價的影響。";
        suggestions = `
            <ul>
                <li>🧘 <strong>增強自覺：</strong>練習察覺什麼時候過度在意他人看法，學會暫停和思考</li>
                <li>💭 <strong>重新框架：</strong>將焦點從"他們怎麼想"轉向"這對我重要嗎"</li>
                <li>🎨 <strong>培養興趣：</strong>發展個人愛好，增強內在價值感</li>
                <li>👥 <strong>選擇圈子：</strong>多與支持您的人相處，減少與負面評價者的接觸</li>
                <li>📝 <strong>寫日記：</strong>記錄自己的想法和感受，增強自我了解</li>
            </ul>
        `;
    } else {
        level = "高 FOPO 水平";
        description = "您很容易受到他人看法的影響，這可能會限制您的自我表達和決策能力。但請記住，這並不代表您有任何問題，而是說明您很關心人際關係，這本身是一種優點。";
        suggestions = `
            <ul>
                <li>🛡️ <strong>建立界限：</strong>學會區分建設性批評和惡意評價，不是所有意見都值得在意</li>
                <li>💖 <strong>自我關愛：</strong>每天給自己正面肯定，培養內在的支持聲音</li>
                <li>🎭 <strong>小步實驗：</strong>在安全的環境中練習表達真實的自己</li>
                <li>🧠 <strong>認知重構：</strong>質疑那些"每個人都在評判我"的想法</li>
                <li>💬 <strong>尋求支持：</strong>考慮與信任的朋友、家人或專業諮詢師聊聊</li>
                <li>🌱 <strong>漸進改變：</strong>設定小目標，逐步增強自信心</li>
            </ul>
        `;
    }
    
    return `
        <h3>${level}</h3>
        <p style="margin: 15px 0; line-height: 1.6;">${description}</p>
        <h4 style="color: #6c5ce7; margin: 20px 0 10px 0;">🌟 建議與成長方向：</h4>
        ${suggestions}
        <div style="background: linear-gradient(135deg, #74b9ff, #0984e3); color: white; padding: 15px; border-radius: 10px; margin-top: 20px;">
            <p><strong>💡 溫馨提醒：</strong>FOPO 是一個連續性的概念，每個人在不同時期和情境下都可能有不同的表現。重要的是要接納自己，並在需要時尋求成長的機會。</p>
        </div>
    `;
}

// 保存结果
function saveResults(score, additionalData) {
    const results = {
        timestamp: new Date().toISOString(),
        score: score,
        level: score <= 20 ? 'low' : (score <= 35 ? 'medium' : 'high'),
        additionalData: additionalData
    };
    
    // 保存到localStorage（实际应用中可能需要发送到服务器）
    localStorage.setItem('fopoResults', JSON.stringify(results));
    
    // 控制台输出结果（调试用）
    console.log('FOPO Assessment Results:', results);
}

// 重置表单
function resetForm() {
    // 隐藏结果，显示表单
    resultDiv.classList.add('hidden');
    
    // 重置表单数据
    form.reset();
    
    // 重置进度条
    currentProgress = 0;
    updateProgress();
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 移除任何错误提示
    const existingError = document.querySelector('.validation-errors');
    if (existingError) {
        existingError.remove();
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .validation-errors {
        animation: fadeIn 0.5s ease-out;
    }
`;
document.head.appendChild(style);

// 添加键盘快捷键支持
document.addEventListener('keydown', function(e) {
    // Enter键提交表单
    if (e.key === 'Enter' && e.ctrlKey) {
        if (!submitBtn.disabled) {
            handleSubmit(e);
        }
    }
    
    // Escape键关闭结果
    if (e.key === 'Escape' && !resultDiv.classList.contains('hidden')) {
        resetForm();
    }
});

// 添加平滑滚动到未完成问题的功能
function scrollToNextIncompleteQuestion() {
    for (let i = 1; i <= 10; i++) {
        const radios = document.querySelectorAll(`input[name="q${i}"]`);
        if (!Array.from(radios).some(radio => radio.checked)) {
            const question = radios[0].closest('.question');
            question.scrollIntoView({ behavior: 'smooth', block: 'center' });
            question.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                question.style.animation = '';
            }, 500);
            break;
        }
    }
}

// 为提交按钮添加点击时滚动到未完成问题的功能
submitBtn.addEventListener('click', function(e) {
    if (this.disabled) {
        e.preventDefault();
        scrollToNextIncompleteQuestion();
    }
});

// 监听email输入变化
document.querySelector('input[name="email"]').addEventListener('input', updateProgress);

// 发送数据到webhook
async function sendToWebhook(data) {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json().catch(() => ({}));
        console.log('Webhook 發送成功:', result);
        return result;
        
    } catch (error) {
        console.error('Webhook 發送失敗:', error);
        throw new Error(`數據傳送失敗: ${error.message}`);
    }
}

// 设置提交按钮加载状态
function setSubmitButtonLoading(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>提交中...</span> ⏳';
        submitBtn.style.opacity = '0.7';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>提交問卷</span> ✨';
        submitBtn.style.opacity = '1';
        // 重新检查是否可以提交
        updateProgress();
    }
}

// 显示提交错误
function showSubmitError(errorMessage) {
    // 创建错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'submit-error';
    errorDiv.innerHTML = `
        <div style="background: #ff6b6b; color: white; padding: 20px; border-radius: 15px; margin: 20px 0; animation: fadeIn 0.5s; text-align: center;">
            <h3>❌ 提交失敗</h3>
            <p style="margin: 10px 0;">${errorMessage}</p>
            <p style="margin: 10px 0; font-size: 0.9em; opacity: 0.9;">請檢查網路連接後重試，或聯繫技術支援。</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 15px; border-radius: 20px; cursor: pointer; margin-top: 10px;">
                關閉
            </button>
        </div>
    `;
    
    // 移除之前的错误提示
    const existingError = document.querySelector('.submit-error');
    if (existingError) {
        existingError.remove();
    }
    
    // 插入新的错误提示
    form.insertBefore(errorDiv, document.querySelector('.form-actions'));
    
    // 滚动到错误提示
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 10秒后自动移除错误提示
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

// 显示提交成功消息
function showSubmitSuccess() {
    // 创建成功提示
    const successDiv = document.createElement('div');
    successDiv.className = 'submit-success';
    successDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #00b894, #00cec9); color: white; padding: 20px; border-radius: 15px; margin: 20px 0; animation: fadeIn 0.5s; text-align: center;">
            <h3>✅ 提交成功</h3>
            <p style="margin: 10px 0;">您的問卷回答已成功傳送，感謝您的參與！</p>
            <p style="margin: 10px 0; font-size: 0.9em; opacity: 0.9;">數據已安全發送到指定系統進行分析處理。</p>
        </div>
    `;
    
    // 插入成功提示
    form.insertBefore(successDiv, document.querySelector('.form-actions'));
    
    // 3秒后自动移除成功提示
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}