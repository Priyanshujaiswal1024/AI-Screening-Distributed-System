/**
 * Speech utilities for cleaning text and playing it back using Web Speech API
 */

/**
 * Strips markdown symbols, links, emojis, and formatting so the speech output sounds natural.
 */
export function cleanTextForSpeech(text) {
    if (!text) return '';
    
    let clean = text
        // Remove links [text](url) -> text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown formatting characters (bold, italic, code, headers)
        .replace(/[*#_`~>|-]/g, '')
        // Clean multiple newlines and spaces
        .replace(/\s+/g, ' ')
        .trim();
        
    return clean;
}

let activeSpeechIndex = null;
let currentUtterances = [];

/**
 * Stop any currently running speech synthesis.
 */
export function stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    currentUtterances = [];
    activeSpeechIndex = null;
}

/**
 * Speaks the given text. Splits it into logical sentences to avoid browser speech timeout issues.
 */
export function speakText(text, onStart, onEnd, onError) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onError) onError('Speech Synthesis not supported in this browser');
        return;
    }

    // Cancel current speech first
    stopSpeaking();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) {
        if (onEnd) onEnd();
        return;
    }

    // Split text into sentences/phrases
    const sentenceRegex = /[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g;
    const sentences = cleaned.match(sentenceRegex) || [cleaned];
    const chunks = sentences.map(s => s.trim()).filter(Boolean);

    if (chunks.length === 0) {
        if (onEnd) onEnd();
        return;
    }

    if (onStart) onStart();

    let index = 0;

    function speakNext() {
        if (index >= chunks.length) {
            if (onEnd) onEnd();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        
        // Find a suitable voice (prefer natural-sounding English voice)
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.includes('en-US') && v.name.toLowerCase().includes('google')) ||
                      voices.find(v => v.lang.includes('en-US') && v.name.toLowerCase().includes('natural')) ||
                      voices.find(v => v.lang.includes('en-US')) ||
                      voices.find(v => v.lang.startsWith('en')) ||
                      voices[0];

        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
            index++;
            speakNext();
        };

        utterance.onerror = (e) => {
            // "interrupted" is a normal event when stopSpeaking is called, don't count it as a hard error
            if (e.error !== 'interrupted') {
                console.error('SpeechSynthesisUtterance error:', e);
                if (onError) onError(e);
            }
            if (onEnd) onEnd();
        };

        currentUtterances.push(utterance);
        window.speechSynthesis.speak(utterance);
    }

    // Ensure voices are loaded (on some browsers they load asynchronously)
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            speakNext();
        };
    } else {
        speakNext();
    }
}
