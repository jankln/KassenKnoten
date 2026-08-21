"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { KnotMark } from "@/components/brand/knot-mark";
import { formatInterval } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { completeOnboarding } from "./actions";

type DraftIncome = { id: number; label: string };
type DraftMember = {
  name: string;
  colorIndex: number;
  incomes: DraftIncome[];
};

const INTERVALS = [1, 3, 6, 12] as const;
const emptyIncome = (id: number): DraftIncome => ({ id, label: "" });

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState<DraftMember[]>(() => [
    { name: "", colorIndex: 1, incomes: [emptyIncome(1)] },
  ]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const copy = de.onboarding;

  function updateMember(index: number, name: string) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, name } : member,
      ),
    );
  }

  function addSecondMember() {
    setMembers((current) => [
      ...current,
      { name: "", colorIndex: 2, incomes: [emptyIncome(1)] },
    ]);
  }

  function removeSecondMember() {
    setMembers((current) => current.slice(0, 1));
  }

  function updateIncomeLabel(memberIndex: number, incomeId: number, label: string) {
    setMembers((current) =>
      current.map((member, currentMemberIndex) =>
        currentMemberIndex === memberIndex
          ? {
              ...member,
              incomes: member.incomes.map((income) =>
                income.id === incomeId ? { ...income, label } : income,
              ),
            }
          : member,
      ),
    );
  }

  function addIncome(memberIndex: number) {
    setMembers((current) =>
      current.map((member, currentMemberIndex) =>
        currentMemberIndex === memberIndex
          ? {
              ...member,
              incomes: [
                ...member.incomes,
                emptyIncome(
                  Math.max(0, ...member.incomes.map((income) => income.id)) + 1,
                ),
              ],
            }
          : member,
      ),
    );
  }

  function removeIncome(memberIndex: number, incomeId: number) {
    setMembers((current) =>
      current.map((member, currentMemberIndex) =>
        currentMemberIndex === memberIndex
          ? {
              ...member,
              incomes: member.incomes.filter((income) => income.id !== incomeId),
            }
          : member,
      ),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const onboardingMembers = members.map((member, index) => {
      const incomes = member.incomes.flatMap((income) => {
        const fieldKey = `${index}-${income.id}`;
        const label = String(formData.get(`incomeLabel-${fieldKey}`) ?? "").trim();
        const amountValue = String(formData.get(`incomeAmountCents-${fieldKey}`) ?? "");
        if (!label && !amountValue) return [];

        return [
          {
            label,
            kind: String(formData.get(`incomeKind-${fieldKey}`) ?? "salary"),
            amountCents: amountValue === "" ? -1 : Number(amountValue),
            intervalMonths: Number(
              formData.get(`incomeIntervalMonths-${fieldKey}`) ?? 1,
            ),
          },
        ];
      });
      return { name: member.name, colorIndex: member.colorIndex, incomes };
    });
    formData.set("members", JSON.stringify(onboardingMembers));

    setError(undefined);
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result.error) setError(result.error);
    });
  }

  const canContinue = members.every((member) => member.name.trim().length > 0);

  return (
    <Card className="mx-auto w-full max-w-xl p-5 sm:p-8">
      <div className="mb-8 flex items-center gap-3">
        <KnotMark className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">{de.app.name}</p>
          <p className="text-ink-muted text-sm">{copy.stepLabel(step + 1, 3)}</p>
        </div>
      </div>

      <div className="bg-surface-muted mb-8 h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-brass h-full rounded-full transition-[width]"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>

      <form onSubmit={submit}>
        {step === 0 ? (
          <section aria-labelledby="welcome-title">
            <h1 id="welcome-title" className="font-display text-2xl font-semibold">
              {copy.introTitle}
            </h1>
            <p className="text-ink-muted mt-3 leading-relaxed">{copy.introBody}</p>
            <div className="mt-8 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setStep(1)}
              >
                {copy.next}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section aria-labelledby="members-title">
            <h1 id="members-title" className="font-display text-2xl font-semibold">
              {copy.membersTitle}
            </h1>
            <p className="text-ink-muted mt-3 leading-relaxed">{copy.membersBody}</p>
            <div className="mt-6 space-y-4">
              {members.map((member, index) => (
                <Field
                  key={index}
                  label={
                    index === 0 ? copy.memberName : `${copy.memberName} ${index + 1}`
                  }
                  htmlFor={`member-${index}`}
                >
                  <Input
                    id={`member-${index}`}
                    value={member.name}
                    onChange={(event) => updateMember(index, event.target.value)}
                    placeholder={copy.memberNamePlaceholder}
                    maxLength={40}
                    autoComplete="name"
                    required={index === 0}
                    autoFocus={index === 0}
                  />
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {members.length === 1 ? (
                <Button type="button" variant="ghost" onClick={addSecondMember}>
                  {copy.addSecondMember}
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={removeSecondMember}>
                  {copy.removeSecondMember}
                </Button>
              )}
            </div>
            {error ? (
              <p role="alert" className="text-negative mt-4 text-sm">
                {error}
              </p>
            ) : null}
            <div className="mt-8 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                {copy.back}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => canContinue && setStep(2)}
                disabled={!canContinue}
              >
                {copy.next}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-labelledby="income-title">
            <h1 id="income-title" className="font-display text-2xl font-semibold">
              {copy.incomeTitle}
            </h1>
            <p className="text-ink-muted mt-3 leading-relaxed">{copy.incomeBody}</p>
            <div className="mt-6 space-y-6">
              {members.map((member, index) => (
                <fieldset
                  key={index}
                  className="border-line rounded-control min-w-0 border p-4"
                >
                  <legend className="px-1 text-sm font-semibold">
                    {copy.incomeFor(member.name)}
                  </legend>
                  <div className="mt-3 space-y-4">
                    {member.incomes.map((income, incomeIndex) => {
                      const fieldKey = `${index}-${income.id}`;
                      return (
                        <div
                          key={income.id}
                          className="border-line/70 rounded-control space-y-4 border p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {copy.incomeSource(incomeIndex + 1)}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIncome(index, income.id)}
                            >
                              {copy.removeIncome}
                            </Button>
                          </div>
                          <Field
                            label={de.sections.household.incomeLabel}
                            htmlFor={`income-label-${fieldKey}`}
                          >
                            <Input
                              id={`income-label-${fieldKey}`}
                              name={`incomeLabel-${fieldKey}`}
                              value={income.label}
                              onChange={(event) =>
                                updateIncomeLabel(index, income.id, event.target.value)
                              }
                              placeholder={copy.incomeLabelPlaceholder}
                              maxLength={60}
                            />
                          </Field>
                          <Field
                            label={de.sections.household.amount}
                            htmlFor={`income-amount-${fieldKey}`}
                          >
                            <MoneyInput
                              id={`income-amount-${fieldKey}`}
                              name={`incomeAmountCents-${fieldKey}`}
                            />
                          </Field>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field
                              label={de.sections.household.interval}
                              htmlFor={`income-interval-${fieldKey}`}
                            >
                              <Select
                                id={`income-interval-${fieldKey}`}
                                name={`incomeIntervalMonths-${fieldKey}`}
                                defaultValue={1}
                              >
                                {INTERVALS.map((months) => (
                                  <option key={months} value={months}>
                                    {formatInterval(months)}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                            <Field
                              label={de.sections.household.incomeKind}
                              htmlFor={`income-kind-${fieldKey}`}
                            >
                              <Select
                                id={`income-kind-${fieldKey}`}
                                name={`incomeKind-${fieldKey}`}
                                defaultValue="salary"
                              >
                                <option value="salary">
                                  {de.sections.household.incomeKindSalary}
                                </option>
                                <option value="other">
                                  {de.sections.household.incomeKindOther}
                                </option>
                              </Select>
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => addIncome(index)}
                    >
                      {copy.addIncome}
                    </Button>
                  </div>
                </fieldset>
              ))}
            </div>
            {error ? (
              <p role="alert" className="text-negative mt-4 text-sm">
                {error}
              </p>
            ) : null}
            <div className="mt-8 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                {copy.back}
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={pending}>
                {pending ? copy.saving : copy.finish}
              </Button>
            </div>
          </section>
        ) : null}
      </form>
    </Card>
  );
}
