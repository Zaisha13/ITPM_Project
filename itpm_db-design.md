-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 30, 2025 at 08:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `itpm_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_account`
--

CREATE TABLE `tbl_account` (
  `AccountID` int(11) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Role` varchar(20) NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `UpdatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_account`
--

INSERT INTO `tbl_account` (`AccountID`, `Username`, `Email`, `PasswordHash`, `Role`, `CreatedAt`, `UpdatedAt`) VALUES
(1, 'karylleT', 'karylle@example.com', '$2b$12$exampleHashedPasswordHere', 'Customer', '2025-10-17 21:17:48', '2025-10-17 21:17:48'),
(4, 'hellmeryUpdated', 'hellmery@demo.comm', '$2y$10$UDEGFPoy6OiKolK12U11O.dhi9IC2TNnA/E.cUzQVIX4GUtyA0euq', 'Customer', '2025-10-26 23:04:05', '2025-10-27 00:21:54'),
(5, 'htorres', 'htorres@demo.com', '$2y$10$t6IdljJpkyje7B0pVIoNqeBDFPdrEtlGrUrDLhTFoWTZV0Ut1dKv2', 'Customer', '2025-10-26 23:27:44', '2025-10-26 23:27:44');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_admin`
--

CREATE TABLE `tbl_admin` (
  `AdminID` int(11) NOT NULL,
  `AccountID` int(11) NOT NULL,
  `FirstName` varchar(50) NOT NULL,
  `LastName` varchar(50) NOT NULL,
  `Phone` varchar(20) NOT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `UpdatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_advisory_notif`
--

CREATE TABLE `tbl_advisory_notif` (
  `AdvisoryID` int(11) NOT NULL,
  `Title` varchar(100) NOT NULL,
  `Message` text NOT NULL,
  `Status` varchar(50) NOT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `UpdatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_container_count`
--

CREATE TABLE `tbl_container_count` (
  `CountID` int(11) NOT NULL,
  `ContainerTypeID` int(11) NOT NULL,
  `Stock` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_container_count`
--

INSERT INTO `tbl_container_count` (`CountID`, `ContainerTypeID`, `Stock`) VALUES
(3, 1, 42),
(4, 2, 33);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_container_type`
--

CREATE TABLE `tbl_container_type` (
  `ContainerTypeID` int(11) NOT NULL,
  `ContainerTypeName` varchar(50) NOT NULL,
  `RefillPrice` decimal(10,2) NOT NULL,
  `NewContainerPrice` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_container_type`
--

INSERT INTO `tbl_container_type` (`ContainerTypeID`, `ContainerTypeName`, `RefillPrice`, `NewContainerPrice`) VALUES
(1, 'Slim', 35.00, 75.00),
(2, 'Round', 35.00, 80.00),
(3, 'Small', 10.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_customer`
--

CREATE TABLE `tbl_customer` (
  `CustomerID` int(11) NOT NULL,
  `CustomerTypeID` int(11) NOT NULL,
  `AccountID` int(11) DEFAULT NULL,
  `FirstName` varchar(50) NOT NULL,
  `LastName` varchar(50) NOT NULL DEFAULT '''''',
  `Phone` varchar(20) NOT NULL DEFAULT '''''',
  `HouseAddress` varchar(255) NOT NULL DEFAULT '''''',
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `UpdatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_customer`
--

INSERT INTO `tbl_customer` (`CustomerID`, `CustomerTypeID`, `AccountID`, `FirstName`, `LastName`, `Phone`, `HouseAddress`, `CreatedAt`, `UpdatedAt`) VALUES
(1, 1, NULL, 'Ana', 'Santos', '09179992222', 'Lot 5, Brgy. Uno', '2025-10-12 04:15:48', '2025-10-12 04:52:00'),
(2, 2, NULL, 'Karylle', 'Pangilinan', '09995018085', 'New Address, Marikina', '2025-10-17 16:37:55', '2025-10-18 02:42:21'),
(5, 2, 1, 'Karylle', 'Torres', '90867584321', 'Lot 9, Brgy. Concepcion', '2025-10-17 21:19:21', '2025-10-17 21:19:21'),
(7, 2, NULL, 'Gab', 'Concepcion', '09087584821', 'Lot 9, Brgy. Concepcion', '2025-10-18 17:34:56', '2025-10-18 17:34:56'),
(8, 1, NULL, 'Hannah', 'Torres', '09876546378', 'Lot 5, Diwata St.', '2025-10-18 21:56:19', '2025-10-18 21:56:19'),
(10, 1, NULL, 'Diana', 'Rivera', '09178889999', 'Blk 5 Lot 10, Brgy. Kalye', '2025-10-19 01:21:17', '2025-10-19 01:21:17'),
(11, 1, NULL, 'Gela', 'Alonte', '0987656473', 'Blk 10 Lot 11, Brgy. Corrupt', '2025-10-19 01:47:39', '2025-10-19 01:47:39'),
(12, 1, NULL, 'Gabriela', 'Alonzo', '09121234243', 'Lot 10, Brgy. Moira', '2025-10-19 02:23:45', '2025-10-19 05:08:36'),
(15, 1, 4, 'Mary', 'Balcarse', '09123123123', 'Lot 22, Brgy. Maria Makiling', '2025-10-26 23:04:05', '2025-10-27 00:21:54'),
(16, 1, 5, 'Hannah', 'Torres', '09876574632', 'Lot 69, Brgy. Diwata', '2025-10-26 23:27:44', '2025-10-26 23:27:44');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_customer_type`
--

CREATE TABLE `tbl_customer_type` (
  `CustomerTypeID` int(11) NOT NULL,
  `CustomerTypeName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_customer_type`
--

INSERT INTO `tbl_customer_type` (`CustomerTypeID`, `CustomerTypeName`) VALUES
(1, 'Regular'),
(2, 'Dealer');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_delivery_details`
--

CREATE TABLE `tbl_delivery_details` (
  `DeliveryDetailID` int(11) NOT NULL,
  `CustomerID` int(11) NOT NULL,
  `DeliveryAddress` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_delivery_details`
--

INSERT INTO `tbl_delivery_details` (`DeliveryDetailID`, `CustomerID`, `DeliveryAddress`) VALUES
(1, 7, 'Alternate Address, Brgy. Uno'),
(2, 5, 'New Delivery Address, Marikina'),
(3, 1, 'Address yes hehe'),
(5, 10, 'Blk 5 Lot 10, Brgy. Kalye'),
(6, 11, 'Blk 10 Lot 11, Brgy. Corrupt'),
(7, 10, 'Address address'),
(8, 11, 'Address address'),
(9, 12, 'Lot 10, Brgy. Maira'),
(10, 12, 'Address address'),
(11, 1, 'Lot 5, Brgy. Uno'),
(12, 5, 'Lot 9, Brgy. Concepcion'),
(13, 5, 'Blk 12 Lot 7, Roseville Subd., Taguig City'),
(14, 5, 'bahay ni shanti');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_feedback`
--

CREATE TABLE `tbl_feedback` (
  `Feedback_ID` int(11) NOT NULL,
  `OrderID` int(11) NOT NULL,
  `RatingScaleID` int(11) NOT NULL,
  `Comments` varchar(255) NOT NULL,
  `Feedback_Date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_mop`
--

CREATE TABLE `tbl_mop` (
  `MOPID` int(11) NOT NULL,
  `MOPName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_mop`
--

INSERT INTO `tbl_mop` (`MOPID`, `MOPName`) VALUES
(1, 'Cash'),
(2, 'GCash'),
(3, 'Loan');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_orders`
--

CREATE TABLE `tbl_orders` (
  `OrderID` int(11) NOT NULL,
  `CustomerID` int(11) NOT NULL,
  `OrderTypeID` int(11) NOT NULL,
  `OrderStatusID` int(11) NOT NULL,
  `ReceivingMethodID` int(11) NOT NULL,
  `MOPID` int(11) NOT NULL,
  `PaymentStatusID` int(11) DEFAULT NULL,
  `TotalAmount` decimal(10,2) NOT NULL,
  `DeliveryDetailID` int(11) NOT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `UpdatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_orders`
--

INSERT INTO `tbl_orders` (`OrderID`, `CustomerID`, `OrderTypeID`, `OrderStatusID`, `ReceivingMethodID`, `MOPID`, `PaymentStatusID`, `TotalAmount`, `DeliveryDetailID`, `CreatedAt`, `UpdatedAt`) VALUES
(1, 7, 1, 2, 1, 1, 1, 275.00, 1, '2025-10-18 17:34:56', '2025-10-19 03:24:10'),
(2, 5, 1, 8, 2, 2, 4, 150.00, 2, '2025-10-18 17:49:11', '2025-10-30 15:12:59'),
(3, 1, 1, 1, 2, 1, 2, 110.00, 3, '2025-10-18 17:57:56', '2025-10-19 05:06:17'),
(6, 10, 1, 1, 2, 1, 1, 150.00, 5, '2025-10-19 01:21:17', '2025-10-19 01:21:17'),
(7, 11, 1, 1, 2, 1, 1, 150.00, 6, '2025-10-19 01:47:39', '2025-10-19 01:47:39'),
(8, 10, 1, 1, 2, 1, 1, 115.00, 5, '2025-10-19 01:48:14', '2025-10-19 01:48:14'),
(9, 10, 1, 1, 2, 1, 1, 230.00, 7, '2025-10-19 01:54:31', '2025-10-19 01:54:31'),
(10, 11, 1, 1, 2, 1, 1, 230.00, 8, '2025-10-19 01:55:45', '2025-10-19 01:55:45'),
(11, 11, 1, 8, 2, 1, NULL, 240.00, 8, '2025-10-19 01:56:45', '2025-10-19 04:56:30'),
(17, 1, 2, 1, 1, 2, 1, 150.00, 11, '2025-10-26 03:54:08', '2025-10-26 03:54:08'),
(18, 1, 2, 1, 1, 2, 1, 175.00, 11, '2025-10-26 04:11:46', '2025-10-26 04:11:46'),
(19, 5, 2, 8, 1, 2, 4, 240.00, 12, '2025-10-26 04:29:33', '2025-10-30 15:13:32'),
(20, 5, 2, 1, 1, 2, 1, 30.00, 13, '2025-10-26 04:36:33', '2025-10-26 04:36:33'),
(21, 5, 2, 7, 1, 2, 3, 35.00, 13, '2025-10-26 04:37:13', '2025-10-26 17:44:20'),
(22, 5, 2, 8, 2, 2, 4, 70.00, 14, '2025-10-26 18:00:26', '2025-10-30 15:16:14'),
(23, 5, 2, 1, 2, 2, 1, 70.00, 14, '2025-10-26 18:04:24', '2025-10-26 18:04:24'),
(24, 5, 2, 1, 2, 2, 1, 70.00, 14, '2025-10-26 18:04:47', '2025-10-26 18:04:47'),
(25, 5, 2, 1, 1, 2, 1, 35.00, 13, '2025-10-26 19:07:47', '2025-10-26 19:07:47'),
(26, 5, 2, 1, 1, 2, 1, 35.00, 13, '2025-10-26 19:08:06', '2025-10-26 19:08:06'),
(27, 5, 2, 1, 1, 2, 1, 80.00, 13, '2025-10-26 19:08:21', '2025-10-26 19:08:21'),
(28, 5, 2, 1, 1, 2, 1, 80.00, 13, '2025-10-26 19:32:09', '2025-10-26 19:32:09'),
(29, 12, 1, 1, 1, 1, 1, 35.00, 10, '2025-10-26 19:34:35', '2025-10-26 19:34:35'),
(33, 1, 2, 1, 1, 2, 1, 80.00, 11, '2025-10-26 19:52:40', '2025-10-26 19:52:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_order_category`
--

CREATE TABLE `tbl_order_category` (
  `OrderCategoryID` int(11) NOT NULL,
  `OrderCategoryName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_order_category`
--

INSERT INTO `tbl_order_category` (`OrderCategoryID`, `OrderCategoryName`) VALUES
(1, 'Refill'),
(2, 'New Gallon');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_order_details`
--

CREATE TABLE `tbl_order_details` (
  `OrderDetailID` int(11) NOT NULL,
  `OrderID` int(11) NOT NULL,
  `ContainerTypeID` int(11) NOT NULL,
  `OrderCategoryID` int(11) NOT NULL,
  `Quantity` int(11) NOT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_order_details`
--

INSERT INTO `tbl_order_details` (`OrderDetailID`, `OrderID`, `ContainerTypeID`, `OrderCategoryID`, `Quantity`, `CreatedAt`) VALUES
(1, 1, 1, 1, 1, '2025-10-18 17:34:56'),
(3, 2, 1, 2, 2, '2025-10-18 17:49:11'),
(4, 3, 2, 2, 1, '2025-10-18 17:57:56'),
(5, 3, 3, 1, 3, '2025-10-19 05:05:18'),
(13, 6, 1, 1, 2, '2025-10-19 01:21:17'),
(14, 6, 2, 2, 1, '2025-10-19 01:21:18'),
(15, 7, 1, 1, 2, '2025-10-19 01:47:39'),
(16, 7, 2, 2, 1, '2025-10-19 01:47:39'),
(17, 8, 1, 1, 1, '2025-10-19 01:48:14'),
(18, 8, 2, 2, 1, '2025-10-19 01:48:15'),
(19, 9, 1, 2, 2, '2025-10-19 01:54:31'),
(20, 9, 2, 2, 1, '2025-10-19 01:54:31'),
(21, 10, 1, 2, 2, '2025-10-19 01:55:45'),
(22, 10, 2, 2, 1, '2025-10-19 01:55:45'),
(23, 11, 2, 2, 3, '2025-10-19 04:54:08'),
(30, 1, 2, 2, 3, '2025-10-19 03:24:10'),
(38, 17, 1, 1, 2, '2025-10-26 03:54:08'),
(39, 17, 2, 2, 1, '2025-10-26 03:54:08'),
(40, 18, 2, 1, 2, '2025-10-26 04:11:46'),
(41, 18, 1, 2, 1, '2025-10-26 04:11:46'),
(42, 18, 3, 1, 3, '2025-10-26 04:11:46'),
(43, 19, 2, 2, 1, '2025-10-26 04:29:33'),
(44, 19, 1, 2, 2, '2025-10-26 04:29:33'),
(45, 19, 3, 1, 1, '2025-10-26 04:29:33'),
(46, 20, 3, 1, 3, '2025-10-26 04:36:33'),
(47, 21, 2, 1, 1, '2025-10-26 04:37:13'),
(48, 22, 1, 1, 1, '2025-10-26 18:00:26'),
(49, 22, 2, 1, 1, '2025-10-26 18:00:26'),
(50, 23, 1, 1, 1, '2025-10-26 18:04:24'),
(51, 23, 2, 1, 1, '2025-10-26 18:04:24'),
(52, 24, 1, 1, 1, '2025-10-26 18:04:48'),
(53, 24, 2, 1, 1, '2025-10-26 18:04:48'),
(54, 25, 2, 1, 1, '2025-10-26 19:07:47'),
(55, 26, 2, 1, 1, '2025-10-26 19:08:06'),
(56, 27, 2, 2, 1, '2025-10-26 19:08:21'),
(57, 28, 2, 2, 1, '2025-10-26 19:32:09'),
(58, 29, 1, 1, 1, '2025-10-26 19:34:35'),
(62, 33, 2, 2, 1, '2025-10-26 19:52:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_order_status`
--

CREATE TABLE `tbl_order_status` (
  `OrderStatusID` int(11) NOT NULL,
  `OrderStatusName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_order_status`
--

INSERT INTO `tbl_order_status` (`OrderStatusID`, `OrderStatusName`) VALUES
(1, 'For Approval'),
(2, 'Confirmed'),
(3, 'Pending'),
(4, 'In Progress'),
(5, 'Out for Delivery'),
(6, 'Ready for Pickup'),
(7, 'Completed'),
(8, 'Cancelled');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_order_type`
--

CREATE TABLE `tbl_order_type` (
  `OrderTypeID` int(11) NOT NULL,
  `OrderTypeName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_order_type`
--

INSERT INTO `tbl_order_type` (`OrderTypeID`, `OrderTypeName`) VALUES
(1, 'Walk-in (Offline)'),
(2, 'Online');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_status`
--

CREATE TABLE `tbl_payment_status` (
  `PaymentStatusID` int(11) NOT NULL,
  `PaymentStatusName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_status`
--

INSERT INTO `tbl_payment_status` (`PaymentStatusID`, `PaymentStatusName`) VALUES
(1, 'Pending'),
(2, 'Unpaid'),
(3, 'Paid'),
(4, 'Cancelled');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_rating_scale`
--

CREATE TABLE `tbl_rating_scale` (
  `RatingScaleID` int(11) NOT NULL,
  `ScaleValue` int(11) NOT NULL,
  `Description` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_rating_scale`
--

INSERT INTO `tbl_rating_scale` (`RatingScaleID`, `ScaleValue`, `Description`) VALUES
(1, 1, 'Poor'),
(2, 2, 'Fair'),
(3, 3, 'Good'),
(4, 4, 'Very Good'),
(5, 5, 'Excellent');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_receiving_method`
--

CREATE TABLE `tbl_receiving_method` (
  `ReceivingMethodID` int(11) NOT NULL,
  `ReceivingMethodName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_receiving_method`
--

INSERT INTO `tbl_receiving_method` (`ReceivingMethodID`, `ReceivingMethodName`) VALUES
(1, 'Pick-up'),
(2, 'Delivery');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_account`
--
ALTER TABLE `tbl_account`
  ADD PRIMARY KEY (`AccountID`),
  ADD UNIQUE KEY `UC_email` (`Email`),
  ADD UNIQUE KEY `UC_username` (`Username`);

--
-- Indexes for table `tbl_admin`
--
ALTER TABLE `tbl_admin`
  ADD PRIMARY KEY (`AdminID`),
  ADD UNIQUE KEY `Phone` (`Phone`),
  ADD KEY `FK_account_id` (`AccountID`);

--
-- Indexes for table `tbl_advisory_notif`
--
ALTER TABLE `tbl_advisory_notif`
  ADD PRIMARY KEY (`AdvisoryID`);

--
-- Indexes for table `tbl_container_count`
--
ALTER TABLE `tbl_container_count`
  ADD PRIMARY KEY (`CountID`),
  ADD KEY `FK_containerID` (`ContainerTypeID`);

--
-- Indexes for table `tbl_container_type`
--
ALTER TABLE `tbl_container_type`
  ADD PRIMARY KEY (`ContainerTypeID`);

--
-- Indexes for table `tbl_customer`
--
ALTER TABLE `tbl_customer`
  ADD PRIMARY KEY (`CustomerID`),
  ADD UNIQUE KEY `Phone` (`Phone`),
  ADD KEY `FK_customertype_id` (`CustomerTypeID`),
  ADD KEY `FK_acc_id` (`AccountID`);

--
-- Indexes for table `tbl_customer_type`
--
ALTER TABLE `tbl_customer_type`
  ADD PRIMARY KEY (`CustomerTypeID`);

--
-- Indexes for table `tbl_delivery_details`
--
ALTER TABLE `tbl_delivery_details`
  ADD PRIMARY KEY (`DeliveryDetailID`),
  ADD KEY `FK_CstmID` (`CustomerID`);

--
-- Indexes for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD PRIMARY KEY (`Feedback_ID`),
  ADD KEY `FK_RScaleID` (`RatingScaleID`),
  ADD KEY `FK_Order_ID` (`OrderID`);

--
-- Indexes for table `tbl_mop`
--
ALTER TABLE `tbl_mop`
  ADD PRIMARY KEY (`MOPID`);

--
-- Indexes for table `tbl_orders`
--
ALTER TABLE `tbl_orders`
  ADD PRIMARY KEY (`OrderID`),
  ADD KEY `FK_MOPID` (`MOPID`),
  ADD KEY `FK_OrderStatusID` (`OrderStatusID`),
  ADD KEY `FK_OrderTypeID` (`OrderTypeID`),
  ADD KEY `FK_PaymentStatusID` (`PaymentStatusID`),
  ADD KEY `FK_ReceivingMethodID` (`ReceivingMethodID`),
  ADD KEY `FkK_CusID` (`CustomerID`),
  ADD KEY `FK_DelAddress` (`DeliveryDetailID`);

--
-- Indexes for table `tbl_order_category`
--
ALTER TABLE `tbl_order_category`
  ADD PRIMARY KEY (`OrderCategoryID`);

--
-- Indexes for table `tbl_order_details`
--
ALTER TABLE `tbl_order_details`
  ADD PRIMARY KEY (`OrderDetailID`),
  ADD KEY `FK_ordID` (`OrderID`),
  ADD KEY `FK_OrderCategoryID` (`OrderCategoryID`),
  ADD KEY `FK_containerTypeID` (`ContainerTypeID`);

--
-- Indexes for table `tbl_order_status`
--
ALTER TABLE `tbl_order_status`
  ADD PRIMARY KEY (`OrderStatusID`);

--
-- Indexes for table `tbl_order_type`
--
ALTER TABLE `tbl_order_type`
  ADD PRIMARY KEY (`OrderTypeID`);

--
-- Indexes for table `tbl_payment_status`
--
ALTER TABLE `tbl_payment_status`
  ADD PRIMARY KEY (`PaymentStatusID`);

--
-- Indexes for table `tbl_rating_scale`
--
ALTER TABLE `tbl_rating_scale`
  ADD PRIMARY KEY (`RatingScaleID`);

--
-- Indexes for table `tbl_receiving_method`
--
ALTER TABLE `tbl_receiving_method`
  ADD PRIMARY KEY (`ReceivingMethodID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_account`
--
ALTER TABLE `tbl_account`
  MODIFY `AccountID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_admin`
--
ALTER TABLE `tbl_admin`
  MODIFY `AdminID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_advisory_notif`
--
ALTER TABLE `tbl_advisory_notif`
  MODIFY `AdvisoryID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_container_count`
--
ALTER TABLE `tbl_container_count`
  MODIFY `CountID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_container_type`
--
ALTER TABLE `tbl_container_type`
  MODIFY `ContainerTypeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_customer`
--
ALTER TABLE `tbl_customer`
  MODIFY `CustomerID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_customer_type`
--
ALTER TABLE `tbl_customer_type`
  MODIFY `CustomerTypeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2003;

--
-- AUTO_INCREMENT for table `tbl_delivery_details`
--
ALTER TABLE `tbl_delivery_details`
  MODIFY `DeliveryDetailID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  MODIFY `Feedback_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_mop`
--
ALTER TABLE `tbl_mop`
  MODIFY `MOPID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_orders`
--
ALTER TABLE `tbl_orders`
  MODIFY `OrderID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `tbl_order_category`
--
ALTER TABLE `tbl_order_category`
  MODIFY `OrderCategoryID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_order_details`
--
ALTER TABLE `tbl_order_details`
  MODIFY `OrderDetailID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `tbl_order_status`
--
ALTER TABLE `tbl_order_status`
  MODIFY `OrderStatusID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_order_type`
--
ALTER TABLE `tbl_order_type`
  MODIFY `OrderTypeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_payment_status`
--
ALTER TABLE `tbl_payment_status`
  MODIFY `PaymentStatusID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_rating_scale`
--
ALTER TABLE `tbl_rating_scale`
  MODIFY `RatingScaleID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_receiving_method`
--
ALTER TABLE `tbl_receiving_method`
  MODIFY `ReceivingMethodID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_admin`
--
ALTER TABLE `tbl_admin`
  ADD CONSTRAINT `FK_account_id` FOREIGN KEY (`AccountID`) REFERENCES `tbl_account` (`AccountID`);

--
-- Constraints for table `tbl_container_count`
--
ALTER TABLE `tbl_container_count`
  ADD CONSTRAINT `FK_containerID` FOREIGN KEY (`ContainerTypeID`) REFERENCES `tbl_container_type` (`ContainerTypeID`);

--
-- Constraints for table `tbl_customer`
--
ALTER TABLE `tbl_customer`
  ADD CONSTRAINT `FK_acc_id` FOREIGN KEY (`AccountID`) REFERENCES `tbl_account` (`AccountID`);

--
-- Constraints for table `tbl_delivery_details`
--
ALTER TABLE `tbl_delivery_details`
  ADD CONSTRAINT `FK_CstmID` FOREIGN KEY (`CustomerID`) REFERENCES `tbl_customer` (`CustomerID`);

--
-- Constraints for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD CONSTRAINT `FK_FeedbackTypeID` FOREIGN KEY (`Feedback_ID`) REFERENCES `tbl_feedback_type` (`FeedbackTypeID`),
  ADD CONSTRAINT `FK_Order_ID` FOREIGN KEY (`OrderID`) REFERENCES `tbl_orders` (`OrderID`),
  ADD CONSTRAINT `FK_RScaleID` FOREIGN KEY (`RatingScaleID`) REFERENCES `tbl_rating_scale` (`RatingScaleID`);

--
-- Constraints for table `tbl_orders`
--
ALTER TABLE `tbl_orders`
  ADD CONSTRAINT `FK_DelAddress` FOREIGN KEY (`DeliveryDetailID`) REFERENCES `tbl_delivery_details` (`DeliveryDetailID`),
  ADD CONSTRAINT `FK_MOPID` FOREIGN KEY (`MOPID`) REFERENCES `tbl_mop` (`MOPID`),
  ADD CONSTRAINT `FK_OrderStatusID` FOREIGN KEY (`OrderStatusID`) REFERENCES `tbl_order_status` (`OrderStatusID`),
  ADD CONSTRAINT `FK_OrderTypeID` FOREIGN KEY (`OrderTypeID`) REFERENCES `tbl_order_type` (`OrderTypeID`),
  ADD CONSTRAINT `FK_PaymentStatusID` FOREIGN KEY (`PaymentStatusID`) REFERENCES `tbl_payment_status` (`PaymentStatusID`),
  ADD CONSTRAINT `FK_ReceivingMethodID` FOREIGN KEY (`ReceivingMethodID`) REFERENCES `tbl_receiving_method` (`ReceivingMethodID`),
  ADD CONSTRAINT `FkK_CusID` FOREIGN KEY (`CustomerID`) REFERENCES `tbl_customer` (`CustomerID`);

--
-- Constraints for table `tbl_order_details`
--
ALTER TABLE `tbl_order_details`
  ADD CONSTRAINT `FK_OrderCategoryID` FOREIGN KEY (`OrderCategoryID`) REFERENCES `tbl_order_category` (`OrderCategoryID`),
  ADD CONSTRAINT `FK_containerTypeID` FOREIGN KEY (`ContainerTypeID`) REFERENCES `tbl_container_type` (`ContainerTypeID`),
  ADD CONSTRAINT `FK_ordID` FOREIGN KEY (`OrderID`) REFERENCES `tbl_orders` (`OrderID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;