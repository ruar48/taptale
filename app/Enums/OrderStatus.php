<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PendingOrder = 'pending_order';
    case AwaitingPayment = 'awaiting_payment';
    case PaymentVerification = 'payment_verification';
    case PendingDesign = 'pending_design';
    case DesignInProgress = 'design_in_progress';
    case AwaitingCustomerApproval = 'awaiting_customer_approval';
    case RevisionRequested = 'revision_requested';
    case DesignApproved = 'design_approved';
    case InProduction = 'in_production';
    case ReadyForShipment = 'ready_for_shipment';
    case Shipped = 'shipped';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * Human readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::PendingOrder => 'Pending Order',
            self::AwaitingPayment => 'Awaiting Payment',
            self::PaymentVerification => 'Payment Verification',
            self::PendingDesign => 'Pending Design',
            self::DesignInProgress => 'Design in Progress',
            self::AwaitingCustomerApproval => 'Awaiting Your Approval',
            self::RevisionRequested => 'Revision Requested',
            self::DesignApproved => 'Design Approved',
            self::InProduction => 'In Production',
            self::ReadyForShipment => 'Ready for Shipment',
            self::Shipped => 'Shipped',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * Visual tone used for status badges.
     */
    public function tone(): string
    {
        return match ($this) {
            self::PendingOrder, self::AwaitingPayment => 'amber',
            self::PaymentVerification, self::PendingDesign, self::DesignInProgress => 'sky',
            self::AwaitingCustomerApproval, self::RevisionRequested => 'rose',
            self::DesignApproved, self::InProduction, self::ReadyForShipment => 'plum',
            self::Shipped, self::Completed => 'emerald',
            self::Cancelled => 'zinc',
        };
    }

    /**
     * The customer-facing journey stage (1-5) this status belongs to.
     */
    public function stage(): int
    {
        return match ($this) {
            self::PendingOrder, self::AwaitingPayment, self::PaymentVerification, self::Cancelled => 1,
            self::PendingDesign, self::DesignInProgress, self::AwaitingCustomerApproval, self::RevisionRequested => 2,
            self::DesignApproved, self::InProduction => 3,
            self::ReadyForShipment, self::Shipped => 4,
            self::Completed => 5,
        };
    }

    /**
     * Whether moving into this status requires a recorded design approval.
     */
    public function requiresDesignApproval(): bool
    {
        return in_array($this, [
            self::InProduction,
            self::ReadyForShipment,
            self::Shipped,
            self::Completed,
        ], true);
    }

    /**
     * Whether the order is still open (not finished or cancelled).
     */
    public function isOpen(): bool
    {
        return ! in_array($this, [self::Completed, self::Cancelled], true);
    }

    /**
     * Whether the customer may still cancel the order themselves.
     */
    public function isCancellableByCustomer(): bool
    {
        return in_array($this, [self::PendingOrder, self::AwaitingPayment], true);
    }

    /**
     * Whether the customer may submit a payment in this status.
     */
    public function acceptsPayment(): bool
    {
        return in_array($this, [self::PendingOrder, self::AwaitingPayment], true);
    }

    /**
     * Options for select inputs.
     *
     * @return list<array{value: string, label: string, tone: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $status): array => [
            'value' => $status->value,
            'label' => $status->label(),
            'tone' => $status->tone(),
        ], self::cases());
    }
}
