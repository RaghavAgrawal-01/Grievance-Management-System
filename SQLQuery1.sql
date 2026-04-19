UPDATE Grievances
SET Status = 'Pending'
WHERE Status IS NULL OR Status = '';

UPDATE Grievances
SET TicketNumber = 'GRV0000'
WHERE TicketNumber IS NULL OR TicketNumber = '';

SELECT Id, Name, Email, Role FROM Users;
DELETE FROM Users 
WHERE Email = 'mohit@gmail.com';