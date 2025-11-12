'use client';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { MessageSquare, Clock } from './icons';

export function QuestionHistory({ history, onSelectHistory }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageSquare className="h-12 w-12 text-gray-600 mb-3" />
        <p className="text-gray-400">Пока нет вопросов</p>
        <p className="text-sm text-gray-500 mt-1">
          Задайте первый вопрос, чтобы начать
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {history.map((item) => (
          <Card
            key={item.id}
            className="p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors border-gray-700 bg-[rgba(20,20,20,0.6)]"
            onClick={() => onSelectHistory(item)}
          >
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-[#9933ff] shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300 line-clamp-2">
                  {item.question}
                </p>
              </div>
              <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatTime(item.timestamp)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function formatTime(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins}м назад`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}ч назад`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}д назад`;
}

