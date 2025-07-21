function removeVietnameseTones(str) {
  return str.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(endpoint, options, maxRetries = 2, delayMs = 2000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, options);
      if (res.status === 429 || res.status === 503) {
        if (attempt < maxRetries) {
          console.warn(`Retrying after ${res.status}... (${attempt + 1}/${maxRetries})`);
          await sleep(delayMs);
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        console.warn(`Retrying after error... (${attempt + 1}/${maxRetries})`);
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
}

const AUTO_ANSWER_TASKS = `Nhiệm vụ:\n- Phân tích kỹ lưỡng từng đáp án trong các lựa chọn.\n- Giải thích rõ ràng tại sao mỗi đáp án đúng hoặc sai.\n- Nếu có nhiều đáp án có vẻ đúng, hãy giải thích tại sao đáp án được chọn lại là lựa chọn phù hợp nhất, trực tiếp nhất, hoặc có ảnh hưởng lớn nhất đối với bối cảnh câu hỏi, so với các đáp án gần đúng khác.\n- Cuối cùng, ở dòng cuối cùng, hãy trả lời: Đáp án đúng nhất là: <đáp án> (chỉ text của đáp án, phải lấy đúng từ các lựa chọn, không được tự nghĩ ra đáp án mới).`;
const AUTO_ANSWER_NOTES = `Lưu ý quan trọng:\n- Chọn đáp án hợp lý nhất và trực tiếp nhất trong danh sách các lựa chọn.\n- Không được chọn đáp án ngoài các lựa chọn đã cho.`;

const AUTO_ANSWER_PROMPT_TEMPLATE = `PROMPT GỬI AI (PHIÊN BẢN NÂNG CẤP)\nBạn là một chuyên gia phân tích câu hỏi trắc nghiệm. Nhiệm vụ của bạn là tuân thủ nghiêm ngặt quy trình và định dạng dưới đây để đưa ra câu trả lời chính xác nhất kèm theo lập luận sắc bén.\n\nQUY TRÌNH PHÂN TÍCH (BẮT BUỘC TUÂN THỦ)\nBước 1 Giải mã câu hỏi\n\nXác định từ khóa: Liệt kê các từ hoặc cụm từ quan trọng nhất trong câu hỏi.\n\nPhân tích cấu trúc & Logic:\n- Câu hỏi này thuộc dạng nào? (Ví dụ: định nghĩa, so sánh, nhân quả, điền vào chỗ trống).\n- Cấu trúc ngữ pháp của câu hỏi đang mô tả mối quan hệ gì? (Ví dụ: \"Nhiều X xảy ra cho mỗi Y\" nghĩa là Y là nguyên nhân/điều kiện để nhiều X xảy ra).\n\nDiễn giải lại câu hỏi: Viết lại câu hỏi bằng ngôn ngữ đơn giản hơn để chắc chắn bạn đã hiểu đúng100 bản chất của nó.\n\nXác định Nguyên lý cốt lõi: Câu hỏi này đang kiểm tra kiến thức về khái niệm, nguyên lý học thuật nào? (Ví dụ: Phân khúc thị trường, Nhu cầu phái sinh (Derived Demand), 4P trong Marketing, v.v.).\n\nBước2: Phân tích từng lựa chọn\n\nKiểm tra tính hợp lệ: Lần lượt áp dụng từng lựa chọn vào câu hỏi đã được diễn giải ở Bước1\n\nĐối với câu hỏi điền vào chỗ trống: Thay thế từng cặp đáp án vào câu gốc và đánh giá xem câu hoàn chỉnh có hợp lý về mặt logic và kiến thức chuyên môn hay không.\n\nGiải thích Đúng/Sai: Với mỗi lựa chọn, hãy nêu rõ nó \HỢP LÝ\ hay \"VÔ LÝ\ và giải thích ngắn gọn tại sao. Sử dụng ví dụ cụ thể nếu cần thiết để minh họa.\n\nBước3 So sánh và Lựa chọn đáp án tối ưu\n\nSo sánh trực tiếp: Nếu có nhiều hơn một lựa chọn có vẻ \HỢP LÝ\, hãy đặt chúng lên bàn cân và so sánh trực tiếp.\n\nLập luận cho đáp án tốt nhất: Giải thích tại sao đáp án bạn chọn là lựa chọn chính xác nhất, trực tiếp nhất, và mô tả đúng nhất nguyên lý cốt lõi đã xác định ở Bước1 Đồng thời, chỉ ra tại sao các lựa chọn gần đúng khác chỉ đúng một phần, chỉ đúng trong một bối cảnh hẹp, hoặc không phải là câu trả lời cốt lõi.\n\nĐỊNH DẠNG ĐẦU RA (BẮT BUỘC)\nPhân tích:\n\n(Trình bày kết quả của Bước 123ại đây. Bạn có thể sử dụng tiêu đề nhỏ cho từng phần nếu muốn)\n\n1. Phân tích câu hỏi:\n\nDiễn giải: ...\n\nNguyên lý cốt lõi: ...\n\n2. Đánh giá các lựa chọn:\n\nA. [Tên lựa chọn]: VÔ LÝ, vì...\n\nB. Tên lựa chọn]: HỢP LÝ, vì...\n\nC. [Tên lựa chọn]: VÔ LÝ, vì...\n\nD. Tên lựa chọn]: HỢP LÝ, vì...\n\nE. [Tên lựa chọn]: VÔ LÝ, vì...\n\n3. So sánh và kết luận:\n\n(Phần này chỉ cần thiết nếu có nhiều hơn 1áp án \HỢP LÝ\). So sánh giữa B và D, lựa chọn D là chính xác hơn vì nó mô tả một quy luật kinh tế cơ bản và có quy mô lớn hơn, trong khi B chỉ đúng trong một vài trường hợp...\n\n(Dòng cuối cùng phải là đáp án)\nĐáp án đúng nhất là: \n\nNow answer:\nQuestion: {title}\nOptions: {options}\nPhân tích:`;

function enableQuestionClickMode(apikey) {
  // Gỡ các listener cũ nếu có
  document.querySelectorAll('[data-automation-id="questionItem"]').forEach(q => {
    q.removeEventListener('click', q._autoAnswerListener, true);
    q.classList.remove('auto-answer-hover');
    const titleSpan = q.querySelector('[data-automation-id="questionTitle"] .text-format-content');
    if (titleSpan) {
      titleSpan.style.cursor = '';
      titleSpan.removeEventListener('mouseenter', titleSpan._autoAnswerHover);
      titleSpan.removeEventListener('mouseleave', titleSpan._autoAnswerUnhover);
    }
  });
  // Thêm listener mới
  document.querySelectorAll('[data-automation-id="questionItem"]').forEach(q => {
    const titleSpan = q.querySelector('[data-automation-id="questionTitle"] .text-format-content');
    if (!titleSpan) return;
    titleSpan.style.cursor = 'pointer';
    q._autoAnswerListener = async function(e) {
      if (!e.target.closest('[data-automation-id="questionTitle"] .text-format-content')) return;
      e.stopPropagation();
      q.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const title = q.querySelector('[data-automation-id="questionTitle"]')?.innerText || '';
      const options = Array.from(q.querySelectorAll('span.text-format-content')).map(span => {
        const label = span.innerText.trim();
        return { span, label };
      });
      if (options.length === 0) {
        console.log('Không tìm thấy đáp án cho câu hỏi:', title);
        return;
      }
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      // Prompt đúng như yêu cầu user
      const prompt = AUTO_ANSWER_PROMPT_TEMPLATE
        .replace('{title}', title)
        .replace('{options}', options.map((o, i) => `${i + 1}. ${o.label}`).join(' '));
      // Log chi tiết trước khi gửi cho AI
      console.log('--- NHIỆM VỤ ---');
      console.log(AUTO_ANSWER_TASKS);
      console.log('--- LƯU Ý QUAN TRỌNG ---');
      console.log(AUTO_ANSWER_NOTES);
      console.log('--- GỬI CHO AI ---');
      console.log('Câu hỏi:', title);
      console.log('Các lựa chọn:', options.map((o, i) => `${i + 1}. ${o.label}`));
      console.log('Prompt gửi AI:', prompt);
      console.log('------------------');
      let answer = '';
      try {
        const res = await fetchWithRetry(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apikey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
          })
        });
        const data = await res.json();
        console.log('Gemini trả về:', data);
        answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        console.log('Đáp án Gemini trả về:', answer);
      } catch (err) {
        console.error('Lỗi gọi Gemini API:', err);
        return;
      }
      // Parse dòng cuối cùng cóĐáp án đúng nhất là:'
      let finalAnswer = '';
      const lines = answer.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(/Đáp án đúng nhất là: ?(.+)/i);
        if (m) {
          finalAnswer = m[1].replace(/^\d+\.\s*/, '').trim();
          break;
        }
      }
      if (!finalAnswer) finalAnswer = answer.trim();
      // So khớp đáp án: ưu tiên tìm chữ cái trước, sau đó mới tìm text đầy đủ
      const normAnswer = removeVietnameseTones(finalAnswer).replace(/\s+/g, '').toLowerCase();
      let matched = null;
      // Bước 1: Tìm chữ cái đáp án (A, B, C, D, E) và map với option có chữ cái đó
      const letterMatch = normAnswer.match(/^[abcde]$/i);
      if (letterMatch) {
        const letter = letterMatch[0].toUpperCase();
        // Tìm option có chữ cái A., B., C., D., E. trong text
        matched = options.find(o => {
          const optionText = o.label.trim();
          return new RegExp(`^${letter}[\\.\\)\\- ]`).test(optionText);
        });
        if (matched) {
          console.log(`Tìm thấy chữ cái ${letter}, chọn option:`, matched.label);
        } else {
          console.log(`Không tìm thấy option có chữ cái ${letter} trong:`, options.map(o => o.label));
        }
      }
      // Bước 2: Nếu không tìm được chữ cái, tìm text đầy đủ
      if (!matched) {
        matched = options.find(o => removeVietnameseTones(o.label).replace(/\s+/g, '').toLowerCase() === normAnswer);
        if (!matched) {
          // Tìm đáp án gần đúng nhất (chứa trong nhau)
          matched = options.find(o => {
            const normOpt = removeVietnameseTones(o.label).replace(/\s+/g, '').toLowerCase();
            return normOpt.includes(normAnswer) || normAnswer.includes(normOpt);
          });
        }
      }
      
      if (matched) {
        const labelEl = matched.span.closest('label');
        if (labelEl) {
          labelEl.click();
        } else {
          matched.span.click();
        }
        console.log('Đã chọn:', matched.label);
      } else {
        console.log('Không tìm thấy đáp án phù hợp! Các đáp án:', options.map(o => o.label), 'Đáp án Gemini:', finalAnswer);
      }
    };
    q.addEventListener('click', q._autoAnswerListener, true);
  });
  // Xóa CSS highlight nếu có
  const oldStyle = document.getElementById('auto-answer-hover-style');
  if (oldStyle) oldStyle.remove();
  console.log('Đã bật chế độ click từng câu hỏi để giải!');
}

window.addEventListener('enable-tool', (e) => {
  const apikey = e.detail.apikey;
  enableQuestionClickMode(apikey);
}); 