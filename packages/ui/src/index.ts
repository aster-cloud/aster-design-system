/**
 * @aster-cloud/ui — single export surface.
 *
 * Consumers:
 *   import { Button, Card, Alert, PageHeader, … } from "@aster-cloud/ui";
 *
 * Requires the consumer's Tailwind config to extend @aster-cloud/tokens'
 * preset; otherwise class names won't resolve.
 */

// Foundations
export { cn } from './utils.js';

// Actions
export { Button, buttonVariants, type ButtonProps } from './Button.js';
export { IconButton, type IconButtonProps } from './IconButton.js';
export {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  type DropdownProps,
  type DropdownItemProps,
} from './Dropdown.js';

// Surfaces
export {
  Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter,
} from './Card.js';
export { Container, type ContainerProps } from './Container.js';
export { Stack, type StackProps } from './Stack.js';
export { Separator, type SeparatorProps } from './Separator.js';
export { Wordmark, type WordmarkProps } from './Wordmark.js';

// Form controls
export { Input, type InputProps } from './Input.js';
export { Textarea, type TextareaProps } from './Textarea.js';
export { Label, type LabelProps } from './Label.js';
export { Select, type SelectProps } from './Select.js';
export { Toggle, type ToggleProps } from './Toggle.js';
export {
  ListSearchInput,
  type ListSearchInputProps,
} from './ListSearchInput.js';

// Status / feedback
export {
  Alert, AlertTitle, AlertDescription, type AlertProps,
} from './Alert.js';
export { Badge, type BadgeProps } from './Badge.js';
export { Skeleton } from './Skeleton.js';
export { Spinner, type SpinnerProps } from './Spinner.js';
export { Toaster, toast, type ToasterProps } from './toast.js';

// Navigation / structure
export {
  Breadcrumbs,
  type BreadcrumbsProps,
  type BreadcrumbItem,
  type BreadcrumbLinkComponent,
} from './Breadcrumbs.js';
export { PageHeader, type PageHeaderProps } from './PageHeader.js';

// Data display
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
} from './DataTable.js';
export {
  StatCard,
  type StatCardProps,
  type StatCardTone,
} from './StatCard.js';
export { EmptyState, type EmptyStateProps } from './EmptyState.js';

// Overlays
export {
  ConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
} from './ConfirmDialog.js';
