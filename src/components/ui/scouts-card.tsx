"use client";

import { useId, useState, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ScoutsCardVariant =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "purple"
  | "teal"
  | "red"
  | "navy"
  | "blue"
  | "forest"
  | "green"
  | "orange"
  | "yellow"
  | "pink"
  | "grey"
  | "black"
  | "white"
  | "squirrels"
  | "beavers"
  | "cubs"
  | "scouts"
  | "explorers"
  | "network"
  | "adult"
  | "dev";

export type ScoutsCardHeadingLevel = 2 | 3 | 4 | 5 | 6;

const VARIANT_CLASSES: Record<ScoutsCardVariant, string> = {
  primary: "scouts-card--primary",
  secondary: "scouts-card--secondary",
  success: "scouts-card--success",
  info: "scouts-card--info",
  warning: "scouts-card--warning",
  danger: "scouts-card--danger",
  purple: "scouts-card--purple",
  teal: "scouts-card--teal",
  red: "scouts-card--red",
  navy: "scouts-card--navy",
  blue: "scouts-card--blue",
  forest: "scouts-card--forest",
  green: "scouts-card--green",
  orange: "scouts-card--orange",
  yellow: "scouts-card--yellow",
  pink: "scouts-card--pink",
  grey: "scouts-card--grey",
  black: "scouts-card--black",
  white: "scouts-card--white",
  squirrels: "scouts-card--squirrels",
  beavers: "scouts-card--beavers",
  cubs: "scouts-card--cubs",
  scouts: "scouts-card--scouts",
  explorers: "scouts-card--explorers",
  network: "scouts-card--network",
  adult: "scouts-card--adult",
  dev: "scouts-card--dev",
};

type ScoutsCardHeadingTag = `h${ScoutsCardHeadingLevel}`;

export interface ScoutsCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  titleExtras?: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
  variant?: ScoutsCardVariant;
  collapsible?: boolean;
  /** Controlled collapsed state for a collapsible card. */
  collapsed?: boolean;
  /** Initial collapsed state when the card is not controlled. */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  headingLevel?: ScoutsCardHeadingLevel;
}

export function ScoutsCard({
  title,
  titleExtras,
  actions,
  description,
  variant,
  collapsible = false,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  headingLevel = 2,
  className,
  children,
  ...props
}: ScoutsCardProps) {
  const bodyId = useId();
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed);
  const isControlled = collapsed !== undefined;
  const isCollapsed = collapsible && (isControlled ? collapsed : uncontrolledCollapsed);
  const Heading = `h${headingLevel}` as ScoutsCardHeadingTag;

  function toggleCollapsed() {
    const nextCollapsed = !isCollapsed;
    if (!isControlled) setUncontrolledCollapsed(nextCollapsed);
    onCollapsedChange?.(nextCollapsed);
  }

  return (
    <section
      className={cn(
        "scouts-card",
        variant && VARIANT_CLASSES[variant],
        collapsible && "scouts-card--collapsible",
        isCollapsed && "scouts-card--collapsed",
        className,
      )}
      {...props}
    >
      <div className="scouts-card__header">
        <div className="scouts-card__heading-row">
          <Heading className="scouts-card__title">
            {collapsible ? (
              <button
                type="button"
                className="scouts-card__toggle"
                aria-expanded={!isCollapsed}
                aria-controls={bodyId}
                onClick={toggleCollapsed}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "scouts-card__chevron",
                    isCollapsed && "scouts-card__chevron--collapsed",
                  )}
                />
                <span className="scouts-card__title-text">{title}</span>
              </button>
            ) : (
              <span className="scouts-card__title-text">{title}</span>
            )}
          </Heading>

          {titleExtras !== undefined && titleExtras !== null ? <div className="scouts-card__title-extras">{titleExtras}</div> : null}

          {actions !== undefined && actions !== null ? (
            <div className="scouts-card__actions">{actions}</div>
          ) : null}
        </div>

        {description !== undefined && description !== null ? (
          <p className="scouts-card__description">{description}</p>
        ) : null}
      </div>

      <div
        id={bodyId}
        className="scouts-card__body"
        hidden={collapsible ? isCollapsed : undefined}
      >
        {children}
      </div>
    </section>
  );
}
