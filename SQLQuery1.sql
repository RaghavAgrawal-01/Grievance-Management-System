UPDATE Grievances
SET Status = 'Pending'
WHERE Status IS NULL OR Status = '';

UPDATE Grievances
SET TicketNumber = 'GRV0000'
WHERE TicketNumber IS NULL OR TicketNumber = '';