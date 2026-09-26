<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'contact_number',
        'email',
        'address',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function sales(): HasMany { return $this->hasMany(Sale::class); }
    public function payments(): HasMany { return $this->hasMany(CustomerPayment::class); }

    public function getTotalPurchasesAttribute(): float
    {
        return (float) $this->sales()->where('status', 'completed')->sum('total');
    }

    public function getCreditBalanceAttribute(): float
    {
        return (float) $this->sales()
            ->where('status', 'completed')
            ->whereIn('payment_status', ['unpaid', 'partial'])
            ->sum('balance_due');
    }
}
