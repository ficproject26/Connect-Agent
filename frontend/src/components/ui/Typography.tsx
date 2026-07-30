import React from 'react';

// ─── Heading Component ─────────────────────────────────────────────────────────
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
  size?: '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg';
  weight?: 'bold' | 'extrabold' | 'black';
  gradient?: boolean;
}

export const Heading: React.FC<HeadingProps> = ({
  as: Tag = 'h2',
  size = '2xl',
  weight = 'bold',
  gradient = false,
  className = '',
  children,
  ...props
}) => {
  const sizes = {
    '5xl': 'text-5xl leading-tight',
    '4xl': 'text-4xl leading-tight',
    '3xl': 'text-3xl leading-snug',
    '2xl': 'text-2xl leading-snug',
    xl:    'text-xl leading-snug',
    lg:    'text-lg leading-normal',
  };

  const weights = {
    bold:      'font-bold',
    extrabold: 'font-extrabold',
    black:     'font-black',
  };

  const gradientClass = gradient
    ? 'bg-gradient-to-r from-secondary via-secondary/90 to-primary bg-clip-text text-transparent dark:from-white dark:via-forgeGray-200 dark:to-primary'
    : 'text-forgeGray-900 dark:text-white';

  return (
    <Tag
      className={`font-sans ${sizes[size]} ${weights[weight]} ${gradientClass} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

// ─── Text Component ────────────────────────────────────────────────────────────
interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div';
  size?: 'xs' | 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  variant?: 'default' | 'muted' | 'subtle' | 'inverse' | 'primary' | 'danger' | 'success';
}

export const Text: React.FC<TextProps> = ({
  as: Tag = 'p',
  size = 'sm',
  weight = 'normal',
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const sizes = {
    xs:   'text-xs',
    sm:   'text-sm',
    base: 'text-base',
    lg:   'text-lg',
  };

  const weights = {
    normal:   'font-normal',
    medium:   'font-medium',
    semibold: 'font-semibold',
    bold:     'font-bold',
  };

  const variants = {
    default: 'text-forgeGray-800 dark:text-forgeGray-200',
    muted:   'text-forgeGray-500 dark:text-forgeGray-400',
    subtle:  'text-forgeGray-400 dark:text-forgeGray-500',
    inverse: 'text-white',
    primary: 'text-primary-hover',
    danger:  'text-red-500 dark:text-red-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  };

  // Cast to avoid TypeScript complaining about polymorphic event-handler unions
  const Component = Tag as React.ElementType;
  return (
    <Component className={`${sizes[size]} ${weights[weight]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Component>
  );
};

// ─── Label Component ───────────────────────────────────────────────────────────
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ required, children, className = '', ...props }) => (
  <label
    className={`block text-xs font-semibold text-forgeGray-600 dark:text-forgeGray-400 mb-1 ${className}`}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-red-500">*</span>}
  </label>
);

// ─── Caption Component ─────────────────────────────────────────────────────────
export const Caption: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <span
    className={`text-[10px] font-semibold uppercase tracking-widest text-forgeGray-450 dark:text-forgeGray-500 ${className}`}
    {...props}
  >
    {children}
  </span>
);

// ─── Kicker Component (eyebrow label above headings) ──────────────────────────
interface KickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: React.ReactNode;
}

export const Kicker: React.FC<KickerProps> = ({ icon, children, className = '', ...props }) => (
  <span className={`section-kicker ${className}`} {...props}>
    {icon && <span className="inline-flex">{icon}</span>}
    {children}
  </span>
);

// ─── Code Component ────────────────────────────────────────────────────────────
export const Code: React.FC<React.HTMLAttributes<HTMLElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <code
    className={`px-1.5 py-0.5 rounded-md bg-forgeGray-100 dark:bg-forgeGray-800 text-forgeGray-900 dark:text-forgeGray-100 font-mono text-xs border border-forgeGray-200 dark:border-forgeGray-700 ${className}`}
    {...props}
  >
    {children}
  </code>
);

// ─── Divider ───────────────────────────────────────────────────────────────────
interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => (
  <div className={`relative flex items-center my-4 ${className}`}>
    <div className="flex-grow border-t border-forgeGray-200 dark:border-forgeGray-800" />
    {label && (
      <span className="flex-shrink mx-4 text-xs font-semibold text-forgeGray-400 dark:text-forgeGray-500 uppercase tracking-wider">
        {label}
      </span>
    )}
    {label && <div className="flex-grow border-t border-forgeGray-200 dark:border-forgeGray-800" />}
  </div>
);

// ─── PageTitle ─────────────────────────────────────────────────────────────────
interface PageTitleProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageTitle: React.FC<PageTitleProps> = ({
  title,
  subtitle,
  kicker,
  actions,
  className = '',
}) => (
  <div
    className={`flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-forgeGray-200/50 dark:border-slate-800 pb-6 mb-6 ${className}`}
  >
    <div>
      {kicker && <Kicker className="mb-2">{kicker}</Kicker>}
      <Heading as="h1" size="3xl" weight="black">
        {title}
      </Heading>
      {subtitle && (
        <Text size="sm" variant="muted" weight="semibold" className="mt-1">
          {subtitle}
        </Text>
      )}
    </div>
    {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
  </div>
);
