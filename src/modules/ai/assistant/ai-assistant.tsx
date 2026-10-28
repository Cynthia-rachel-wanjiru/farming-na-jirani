import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, Sparkles, Lightbulb, Droplets, Sprout, Bug, TrendingUp, Loader, ArrowLeft } from 'lucide-react';
import { generateAIResponse } from '../knowledge/farming-knowledge-base';
import { api } from '../../../app/lib/api';

interface AIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIAssistantProps {
  language: 'en' | 'sw';
  userName: string;
  onBack: () => void;
}

export function AIAssistant({ language, userName, onBack }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      content: language === 'en'
        ? `Hello ${userName.split(' ')[0]}! 👋 I'm FarmEcho AI, your farming assistant. I can help you with:\n\n🌱 Crop management and planting advice\n💧 Irrigation and water management\n🐛 Pest and disease identification\n🌾 Fertilizer recommendations\n📊 Market prices and trends\n☀️ Weather and climate tips\n\nWhat would you like to know today?`
        : `Habari ${userName.split(' ')[0]}! 👋 Mimi ni FarmEcho AI, msaidizi wako wa kilimo. Ninaweza kukusaidia na:\n\n🌱 Usimamizi wa mazao na ushauri wa kupanda\n💧 Umwagiliaji na usimamizi wa maji\n🐛 Utambuzi wa wadudu na magonjwa\n🌾 Mapendekezo ya mbolea\n📊 Bei za soko na mwelekeo\n☀️ Vidokezo vya hali ya hewa na tabia nchi\n\nUngependa kujua nini leo?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const translations = {
    en: {
      title: 'Ask AI Assistant',
      subtitle: 'Get instant farming advice powered by AI',
      placeholder: 'Ask me anything about farming...',
      send: 'Send',
      typing: 'AI is thinking...',
      quickQuestions: 'Quick Questions',
      suggestions: [
        { icon: Sprout, text: 'When to plant maize?', query: 'when should I plant maize' },
        { icon: Droplets, text: 'Watering schedule?', query: 'how often should I water my crops' },
        { icon: Bug, text: 'Pest control tips?', query: 'how to control pests naturally' },
        { icon: TrendingUp, text: 'Best crops to grow?', query: 'what are the most profitable crops' },
      ],
    },
    sw: {
      title: 'Uliza Msaidizi wa AI',
      subtitle: 'Pata ushauri wa haraka wa kilimo unaotumia AI',
      placeholder: 'Niulize chochote kuhusu kilimo...',
      send: 'Tuma',
      typing: 'AI inafikiria...',
      quickQuestions: 'Maswali ya Haraka',
      suggestions: [
        { icon: Sprout, text: 'Lini kupanda mahindi?', query: 'ni lini ninapaswa kupanda mahindi' },
        { icon: Droplets, text: 'Ratiba ya kumwagilia?', query: 'ni mara ngapi ninapaswa kumwagilia mazao yangu' },
        { icon: Bug, text: 'Vidokezo vya kudhibiti wadudu?', query: 'jinsi ya kudhibiti wadudu kwa njia ya asili' },
        { icon: TrendingUp, text: 'Mazao bora ya kupanda?', query: 'ni mazao gani yenye faida zaidi' },
      ],
    },
  };

  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const history = [...messages, userMessage].slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.content
      }));
      const sessionToken = localStorage.getItem('farm_echo_session_token');
      const result = await api.chatAI(history, language, sessionToken);
      
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: result?.response || generateAIResponse(textToSend, language),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    } catch (error) {
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(textToSend, language),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (query: string) => {
    handleSendMessage(query);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg p-6 mb-4"
      >
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <Bot className="w-10 h-10 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {t.title}
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </h2>
            <p className="text-purple-100">{t.subtitle}</p>
          </div>
        </div>

        {/* Quick Questions */}
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            {t.quickQuestions}:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {t.suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(suggestion.query)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg px-3 py-2 text-sm transition-all"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-left">{suggestion.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div className="bg-white rounded-xl shadow-lg mb-4 overflow-hidden">
        <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50 to-white">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    message.isUser
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border-2 border-purple-200 text-gray-800 shadow-md'
                  }`}
                >
                  {!message.isUser && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-600">FarmEcho AI</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  <div className={`text-xs mt-2 ${message.isUser ? 'opacity-75 text-right' : 'opacity-50'}`}>
                    {message.timestamp.toLocaleTimeString(language === 'en' ? 'en-KE' : 'sw-KE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border-2 border-purple-200 rounded-2xl px-5 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                  <span className="text-sm text-gray-600">{t.typing}</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="border-t-2 border-purple-100 p-4 bg-white"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">{t.send}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
