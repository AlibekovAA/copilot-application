'use client';
import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Copy, Check } from './icons';

export function AnswerDisplay({ 
  question, 
  answer, 
  isTyping 
}) {
  const [displayedAnswer, setDisplayedAnswer] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isTyping && answer) {
      let index = 0;
      setDisplayedAnswer('');
      const interval = setInterval(() => {
        if (index < answer.length) {
          setDisplayedAnswer(answer.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 10);
      return () => clearInterval(interval);
    } else {
      setDisplayedAnswer(answer);
    }
  }, [answer, isTyping]);

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!question) return null;

  return (
    <div className="space-y-6">
      <Card className="p-6 border-gray-700 bg-[rgba(20,20,20,0.8)] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-gray-700 text-gray-300">Вы</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <p className="text-[#9933ff] font-medium">Ваш вопрос</p>
            <p className="text-gray-200">{question}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-gray-700 bg-[rgba(20,20,20,0.8)] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-[#9933ff] text-white">
              AI
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <p className="text-[#9933ff] font-medium">Ответ</p>
            <div className="prose prose-slate max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{displayedAnswer}</p>
              {isTyping && <span className="inline-block w-2 h-4 bg-[#9933ff] animate-pulse ml-1" />}
            </div>
            {!isTyping && answer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2 text-[#9933ff] hover:text-[#8822ee] hover:bg-[#9933ff]/10"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Копировать ответ
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

