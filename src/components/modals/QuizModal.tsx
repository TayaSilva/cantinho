import { useEffect, useState } from 'react';
import type { QuizConfig } from '../../types/house';
import { BaseModal } from './BaseModal';

export function QuizModal({ open, onClose, quiz }: { open: boolean; onClose: () => void; quiz: QuizConfig }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const questions = quiz.questions;

  useEffect(() => {
    if (open) {
      setStep(0);
      setAnswers([]);
      setFinished(false);
    }
  }, [open, quiz]);

  const ready = questions.length > 0 && questions.every((question) => question.prompt.trim() && question.options.length >= 2 && question.options.every((option) => option.text.trim()));
  if (!open || !quiz.published || !ready) return null;
  const question = questions[step];
  const answer = answers[step];
  const optionId = (index: number) => question.options[index]?.id?.trim() || `option-${index}`;
  const choose = (id: string) => setAnswers((current) => {
    const next = current.slice();
    next[step] = id;
    return next;
  });
  const next = () => {
    if (step === questions.length - 1) setFinished(true);
    else setStep((value) => value + 1);
  };
  const replay = () => {
    setStep(0);
    setAnswers([]);
    setFinished(false);
  };

  return (
    <BaseModal open={open} onClose={onClose} title={quiz.title || 'Quiz do cantinho'} headerClass="bg-mansao-soft" widthClass="max-w-[620px]">
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        {!finished ? (
          <>
            <div>
              {quiz.description && <p className="text-sm leading-relaxed text-stone-600">{quiz.description}</p>}
              <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-mansao-deep">
                <span>Pergunta {step + 1} de {questions.length}</span>
                <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100"><div className="h-full bg-mansao transition-[width]" style={{ width: ((step + 1) / questions.length) * 100 + '%' }} /></div>
            </div>
            <h3 className="font-pixel text-xl leading-relaxed text-stone-900">{question.prompt}</h3>
            <div className="grid gap-2.5">
              {question.options.map((option, optionIndex) => {
                const id = optionId(optionIndex);
                return (
                <button key={id} type="button" onClick={() => choose(id)} className={'rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors ' + (answer === id ? 'border-mansao bg-mansao-soft font-semibold text-mansao-deep' : 'border-stone-200 bg-white hover:border-mansao/60')}>
                  {option.text}
                </button>
                );
              })}
            </div>
            <button type="button" data-autofocus disabled={answer === undefined} onClick={next} className="h-11 cursor-pointer rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40">
              {step === questions.length - 1 ? 'Ver resultado' : 'Próxima pergunta'}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-7 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-mansao-soft text-3xl text-mansao-deep">♥</div>
            <h3 className="font-pixel text-2xl text-stone-900">Você terminou!</h3>
            <p className="text-sm font-semibold text-mansao-deep">
              {answers.reduce((score, value, index) => score + (value === questions[index]?.correctOptionId ? 1 : 0), 0)} de {questions.length} respostas corretas
            </p>
            <p className="max-w-md leading-relaxed text-stone-600">{quiz.completionMessage || 'Obrigada por brincar no nosso cantinho.'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={replay} className="h-10 cursor-pointer rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold hover:bg-stone-50">Jogar de novo</button>
              <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
