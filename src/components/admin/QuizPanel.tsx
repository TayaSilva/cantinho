import { useState } from 'react';
import type { HouseContent, QuizConfig, QuizQuestion } from '../../types/house';
import { AdminIcon, Button, Field, Group, TextArea, TextField, Toggle } from './controls';

type SetQuiz = (fn: (quiz: HouseContent['quiz']) => void, key?: string) => void;

const newQuestion = (): QuizQuestion => ({
  id: 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
  prompt: '',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
  ],
  correctOptionId: 'a',
});

export function QuizPanel({ quiz, setQuiz }: { quiz: QuizConfig; setQuiz: SetQuiz }) {
  const [preview, setPreview] = useState(false);
  const ready = quiz.questions.length > 0 && quiz.questions.every((q) => q.prompt.trim() && q.options.every((o) => o.text.trim()));

  return (
    <div className="flex flex-col gap-7">
      <Group title="Quiz da Mini Mansão">
        <p className="text-sm leading-relaxed text-stone-600">Crie uma brincadeira para quem visitar o cantinho. O quiz aparece no computador da sala quando estiver publicado.</p>
        <TextField label="Título" value={quiz.title} maxLength={80} onChange={(v) => setQuiz((q) => void (q.title = v), 'quiz-title')} />
        <TextArea label="Descrição" value={quiz.description} rows={3} onChange={(v) => setQuiz((q) => void (q.description = v), 'quiz-description')} />
        <TextArea label="Mensagem ao terminar" value={quiz.completionMessage} rows={3} onChange={(v) => setQuiz((q) => void (q.completionMessage = v), 'quiz-completion')} />
        <Toggle
          label="Publicar quiz"
          description={ready ? 'O computador ficará clicável para os visitantes.' : 'Preencha todas as perguntas e alternativas antes de publicar.'}
          checked={quiz.published && ready}
          onChange={(v) => setQuiz((q) => void (q.published = v && ready))}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setQuiz((q) => q.questions.length < 10 && q.questions.push(newQuestion()))} disabled={quiz.questions.length >= 10}>
            <AdminIcon name="plus" className="size-4" /> Adicionar pergunta
          </Button>
          <Button onClick={() => setPreview((v) => !v)} disabled={!ready}>
            <AdminIcon name="computer" className="size-4" /> {preview ? 'Fechar prévia' : 'Pré-visualizar'}
          </Button>
        </div>
        <p className="text-xs text-stone-500">{quiz.questions.length}/10 perguntas · cada pergunta pode ter de 2 a 4 alternativas.</p>
      </Group>

      {preview && <QuizPreview quiz={quiz} />}

      {quiz.questions.map((question, index) => (
        <QuestionEditor key={question.id} question={question} index={index} total={quiz.questions.length} setQuiz={setQuiz} />
      ))}

      {quiz.questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center text-sm text-stone-500">Ainda não há perguntas. Comece pelo botão acima.</div>
      )}
    </div>
  );
}

function QuestionEditor({ question, index, total, setQuiz }: { question: QuizQuestion; index: number; total: number; setQuiz: SetQuiz }) {
  const update = (fn: (q: QuizQuestion) => void, key?: string) => setQuiz((quiz) => fn(quiz.questions[index]), key);
  return (
    <Group title={'Pergunta ' + (index + 1)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-stone-500">Resposta correta marcada com o círculo.</span>
        <div className="flex gap-1">
          <Button size="md" aria-label="Mover pergunta para cima" onClick={() => setQuiz((q) => { if (index > 0) [q.questions[index - 1], q.questions[index]] = [q.questions[index], q.questions[index - 1]]; })} disabled={index === 0}><AdminIcon name="up" className="size-4" /></Button>
          <Button size="md" aria-label="Mover pergunta para baixo" onClick={() => setQuiz((q) => { if (index < total - 1) [q.questions[index], q.questions[index + 1]] = [q.questions[index + 1], q.questions[index]]; })} disabled={index === total - 1}><AdminIcon name="down" className="size-4" /></Button>
          <Button size="md" variant="danger" aria-label="Excluir pergunta" onClick={() => setQuiz((q) => { q.questions.splice(index, 1); q.published = false; })}><AdminIcon name="trash" className="size-4" /></Button>
        </div>
      </div>
      <TextArea label="Pergunta" value={question.prompt} rows={3} onChange={(v) => update((q) => { q.prompt = v; }, 'quiz-question-' + question.id)} />
      <Field title="Alternativas" hint="Escolha exatamente uma resposta correta.">
        <div className="flex flex-col gap-2">
          {question.options.map((option, optionIndex) => (
            <div key={option.id} className="flex items-center gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={question.correctOptionId === option.id}
                aria-label={'Marcar alternativa ' + (optionIndex + 1) + ' como correta'}
                onClick={() => update((q) => { q.correctOptionId = option.id; })}
                className={'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-semibold ' + (question.correctOptionId === option.id ? 'border-rose-500 bg-rose-100 text-rose-800' : 'border-stone-300 text-stone-400')}
              >
                {String.fromCharCode(65 + optionIndex)}
              </button>
              <input
                aria-label={'Texto da alternativa ' + (optionIndex + 1)}
                value={option.text}
                onChange={(e) => update((q) => { q.options[optionIndex].text = e.target.value; }, 'quiz-option-' + question.id + '-' + option.id)}
                className="h-[38px] min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder={'Alternativa ' + (optionIndex + 1)}
              />
              <Button size="md" variant="ghost" aria-label="Remover alternativa" disabled={question.options.length <= 2} onClick={() => update((q) => { q.options.splice(optionIndex, 1); if (q.correctOptionId === option.id) q.correctOptionId = q.options[0].id; })}><AdminIcon name="close" className="size-4" /></Button>
            </div>
          ))}
          <Button size="md" className="w-fit" disabled={question.options.length >= 4} onClick={() => update((q) => q.options.push({ id: String.fromCharCode(97 + q.options.length), text: '' }))}><AdminIcon name="plus" className="size-4" /> Adicionar alternativa</Button>
        </div>
      </Field>
    </Group>
  );
}

function QuizPreview({ quiz }: { quiz: QuizConfig }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const question = quiz.questions[step];
  if (finished) {
    const score = answers.reduce((sum, answer, index) => sum + (answer === quiz.questions[index]?.correctOptionId ? 1 : 0), 0);
    return <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-5 text-center"><p className="font-semibold text-stone-900">Prévia concluída · {score}/{quiz.questions.length}</p><p className="mt-2 text-sm text-stone-600">{quiz.completionMessage || 'Fim do quiz.'}</p><Button className="mt-4" onClick={() => { setStep(0); setAnswers([]); setFinished(false); }}>Recomeçar</Button></div>;
  }
  if (!question) return null;
  const answer = answers[step];
  const choose = (id: string) => setAnswers((current) => {
    const next = current.slice();
    next[step] = id;
    return next;
  });
  return (
    <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-5">
      <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">Prévia · {step + 1} de {quiz.questions.length}</p>
      <h3 className="mt-2 font-semibold text-stone-900">{question.prompt || 'Sua pergunta aparecerá aqui.'}</h3>
      <div className="mt-4 grid gap-2">
        {question.options.map((option) => <button key={option.id} type="button" onClick={() => choose(option.id)} className={'rounded-lg border px-3 py-2 text-left text-sm ' + (answer === option.id ? 'border-rose-500 bg-white' : 'border-rose-200 bg-white/60')}>{option.text || 'Alternativa'}</button>)}
      </div>
      <Button variant="primary" className="mt-4" disabled={!answer} onClick={() => step === quiz.questions.length - 1 ? setFinished(true) : setStep((v) => v + 1)}>{step === quiz.questions.length - 1 ? 'Ver resultado' : 'Próxima'}</Button>
    </div>
  );
}
