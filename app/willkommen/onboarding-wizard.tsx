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

type DraftMember = { name: string; colorIndex: number };

const INTERVALS = [1, 3, 6, 12] as const;

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState<DraftMember[]>([{ name: "", colorIndex: 1 }]);
  const [incomeLabels, setIncomeLabels] = useState<string[]>([""]);
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
    setMembers((current) => [...current, { name: "", colorIndex: 2 }]);
    setIncomeLabels((current) => [...current, ""]);
  }

  function removeSecondMember() {
    setMembers((current) => current.slice(0, 1));
    setIncomeLabels((current) => current.slice(0, 1));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const onboardingMembers = members.map((member, index) => {
      const label = String(formData.get(`incomeLabel-${index}`) ?? "").trim();
      const amountValue = String(formData.get(`incomeAmountCents-${index}`) ?? "");
      const amountCents = amountValue === "" ? -1 : Number(amountValue);
      const income =
        label || amountValue
          ? {
              label,
              kind: String(formData.get(`incomeKind-${index}`) ?? "salary"),
              amountCents,
              intervalMonths: Number(
                formData.get(`incomeIntervalMonths-${index}`) ?? 1,
              ),
            }
          : undefined;
      return { ...member, income };
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
                  className="border-line rounded-control border p-4"
                >
                  <legend className="px-1 text-sm font-semibold">
                    {copy.incomeFor(member.name)}
                  </legend>
                  <div className="mt-3 space-y-4">
                    <Field
                      label={de.sections.household.incomeLabel}
                      htmlFor={`income-label-${index}`}
                    >
                      <Input
                        id={`income-label-${index}`}
                        name={`incomeLabel-${index}`}
                        value={incomeLabels[index] ?? ""}
                        onChange={(event) =>
                          setIncomeLabels((current) =>
                            current.map((label, labelIndex) =>
                              labelIndex === index ? event.target.value : label,
                            ),
                          )
                        }
                        placeholder={copy.incomeLabelPlaceholder}
                        maxLength={60}
                      />
                    </Field>
                    <Field
                      label={de.sections.household.amount}
                      htmlFor={`income-amount-${index}`}
                    >
                      <MoneyInput
                        id={`income-amount-${index}`}
                        name={`incomeAmountCents-${index}`}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label={de.sections.household.interval}
                        htmlFor={`income-interval-${index}`}
                      >
                        <Select
                          id={`income-interval-${index}`}
                          name={`incomeIntervalMonths-${index}`}
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
                        htmlFor={`income-kind-${index}`}
                      >
                        <Select
                          id={`income-kind-${index}`}
                          name={`incomeKind-${index}`}
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
