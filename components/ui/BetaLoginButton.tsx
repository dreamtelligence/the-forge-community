type BetaLoginButtonProps = {
  label: string;
  className?: string;
  wrapperClassName?: string;
  tooltipClassName?: string;
  locale?: 'de' | 'en';
  showIcon?: boolean;
  onClick?: () => void;
};

// Authentication has been retired; do not render login affordances.
export default function BetaLoginButton(_props: BetaLoginButtonProps) {
  void _props;
  return null;
}
